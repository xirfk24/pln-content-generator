'use client'

import { apiFetch } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import * as React from 'react'
import { useRouter, usePathname } from '@/compat/next'
import {
  Bell,
  LogOut,
  Menu,
  User,
  CheckSquare,
  AlertCircle,
  Send,
  Clock,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  XCircle,
  CheckCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/constants'
import type { UserRole } from '@/types'
import Link from '@/compat/next'
import {
  type AppNotification,
  type NotificationType,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  formatRelativeTime,
} from '@/lib/notifications'

interface HeaderProps {
  onMenuClick: () => void
  sidebarCollapsed: boolean
}

interface CurrentUser {
  id: string
  email: string | null
  profile: {
    full_name: string
    role: string
  } | null
}

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dasbor Utama',
  '/content/planning': 'Rencana Konten',
  '/content/planning/new': 'Buat Rencana Konten Baru',
  '/content/tabungan': 'Bank Konten',
  '/content/calendar': 'Rencana Konten — Kalender',
  '/content/import': 'Rencana Konten — Import Data',
  '/publishing': 'Antrean Publikasi',
  '/workflow/tasks': 'Tugas Saya',
  '/workflow/approval': 'Persetujuan Konten',
  '/notifications': 'Notifikasi',
  '/analytics': 'Ringkasan Analisis',
  '/analytics/performance': 'Performa Konten',
  '/analytics/insights': 'Wawasan AI',
  '/recap': 'Rekap Konten',
  '/reports': 'Laporan Berkala',
  '/ai': 'Asisten AI',
  '/admin/users': 'Kelola Pengguna',
  '/admin/periods': 'Periode Perencanaan',
  '/periode-perencanaan': 'Periode Perencanaan',
  '/admin/pillars': 'Pilar Konten',
  '/admin/topics': 'Topik Konten',
  '/admin/platforms': 'Platform Media',
}

const ROUTE_SUBTITLES: Record<string, string> = {
  '/dashboard': 'Ringkasan aktivitas konten, alur kerja, dan performa media sosial Bagian Komunikasi PLN UID Jawa Barat.',
  '/content/planning': 'Modul ini digunakan untuk menyusun, mengelola, mengajukan, dan memantau proses pengelolaan konten sebelum dipublikasikan.',
  '/content/planning/new': 'Form penyusunan rencana konten baru dengan pengelompokan pilar komunikasi dan multi-platform.',
  '/content/tabungan': 'Modul ini digunakan untuk menampung konten yang ditunda, belum memiliki waktu publikasi pasti, atau disimpan untuk periode berikutnya dalam Bank Konten.',
  '/content/calendar': 'Tampilan kalender terintegrasi dari jadwal publikasi rencana konten.',
  '/content/import': 'Impor massal rencana konten melalui file spreadsheet/CSV.',
  '/publishing': 'Modul ini digunakan untuk memantau status tayang, mengelola jadwal, mencatat URL publikasi, dan merekam data performa.',
  '/workflow/tasks': 'Modul ini menampilkan daftar tugas penyusunan, perbaikan revisi, dan pencatatan publikasi konten Anda.',
  '/workflow/approval': 'Modul ini digunakan oleh Admin/Reviewer untuk meninjau, menyetujui, atau meminta revisi atas rencana konten yang diajukan.',
  '/notifications': 'Informasi dan aktivitas terbaru yang membutuhkan perhatian Anda.',
  '/analytics': 'Metrik agregat performa dan interaksi konten media sosial lintas platform.',
  '/analytics/performance': 'Peringkat dan efektivitas jangkauan serta engagement konten.',
  '/analytics/insights': 'Analisis cerdas AI untuk optimasi strategi komunikasi Bagian Komunikasi PLN.',
  '/recap': 'Laporan rekapitulasi data konten bulanan dan semesteran sesuai standar Bagian Komunikasi PLN.',
  '/reports': 'Ekspor dan filter laporan performa publikasi berkala.',
  '/ai': 'Alat bantu AI untuk pembuatan brief, copywriting, dan rekomendasi konten.',
  '/admin/users': 'Kelola akun pengguna, hak akses role Admin dan Staf.',
  '/admin/periods': 'Kelola periode perencanaan konten berdasarkan semester.',
  '/periode-perencanaan': 'Kelola periode perencanaan konten berdasarkan semester.',
  '/admin/pillars': 'Kelola daftar pilar komunikasi Bagian Komunikasi PLN (A-Z).',
  '/admin/topics': 'Kelola daftar Topik Konten resmi (A-Z); rename ikut memperbarui konten terkait.',
  '/admin/platforms': 'Kelola platform media sosial tujuan publikasi.',
}

function usePageTitle(pathname: string): string {
  return React.useMemo(() => {
    if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
    if (pathname.startsWith('/content/tabungan')) return 'Bank Konten'
    if (pathname.startsWith('/content/planning/')) return 'Detail Rencana Konten'
    if (pathname.startsWith('/content/')) {
      return pathname.endsWith('/edit') ? 'Edit Rencana Konten' : 'Detail Rencana Konten'
    }
    return 'Sistem Manajemen Konten PLN'
  }, [pathname])
}

function usePageSubtitle(pathname: string): string {
  return React.useMemo(() => {
    if (ROUTE_SUBTITLES[pathname]) return ROUTE_SUBTITLES[pathname]
    if (pathname.startsWith('/content/tabungan')) return 'Kelola konten simpanan di Bank Konten dan jadwalkan ulang saat siap tayang.'
    if (pathname.startsWith('/content/')) {
      return pathname.endsWith('/edit')
        ? 'Perbarui rincian, brief, dan platform rencana konten.'
        : 'Rincian lengkap rencana konten, riwayat alur kerja, dan metrik publikasi.'
    }
    return ''
  }, [pathname])
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = React.useState<CurrentUser | null>(null)

  // Notifications
  const [notifOpen, setNotifOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<AppNotification[]>([])
  const [notifLoading, setNotifLoading] = React.useState(false)
  const notifRef = React.useRef<HTMLDivElement>(null)

  const pageTitle = usePageTitle(pathname)
  const pageSubtitle = usePageSubtitle(pathname)

  // Load user data
  React.useEffect(() => {
    apiFetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user)
        }
      })
      .catch(() => {})
  }, [])

  // Load Notifications
  const loadNotifs = React.useCallback(async () => {
    setNotifLoading(true)
    try {
      const uId = user?.id || null
      const uRole = (user?.profile?.role as UserRole) || null
      const items = await fetchNotifications(uId, uRole)
      setNotifications(items)
    } catch {
      // ignore
    } finally {
      setNotifLoading(false)
    }
  }, [user])

  // Initial and reactive notification fetching
  React.useEffect(() => {
    loadNotifs()
  }, [loadNotifs])

  React.useEffect(() => {
    const handleUpdate = () => {
      const uId = user?.id || null
      const uRole = (user?.profile?.role as UserRole) || null
      fetchNotifications(uId, uRole).then(setNotifications)
    }
    window.addEventListener('pln-notification-update', handleUpdate)
    return () => window.removeEventListener('pln-notification-update', handleUpdate)
  }, [user])

  // Close dropdown on outside click
  React.useEffect(() => {
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [notifOpen])

  function toggleNotif() {
    if (!notifOpen) loadNotifs()
    setNotifOpen((v) => !v)
  }

  // Unread Count
  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  // Handle Mark All Read
  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    const ids = notifications.map((n) => n.id)
    markAllNotificationsAsRead(ids)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  // Handle item click
  const handleNotificationClick = (n: AppNotification) => {
    if (!n.read) {
      markNotificationAsRead(n.id)
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
      )
    }
    setNotifOpen(false)
    router.push(n.actionUrl)
  }

  async function handleLogout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // proceed with client-side redirect anyway
    }
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case 'APPROVAL':
        return <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      case 'REVISION':
        return <RotateCcw className="h-4 w-4 text-rose-600 dark:text-rose-400" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'SCHEDULE':
        return <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      case 'OVERDUE':
        return <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
      case 'PUBLISHED':
        return <Send className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
      default:
        return <Bell className="h-4 w-4 text-primary" />
    }
  }

  const renderIconBg = (type: NotificationType) => {
    switch (type) {
      case 'APPROVAL':
        return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
      case 'REVISION':
        return 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
      case 'REJECTED':
        return 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
      case 'SCHEDULE':
        return 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
      case 'OVERDUE':
        return 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
      case 'PUBLISHED':
        return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
      case 'CANCELLED':
        return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      default:
        return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
    }
  }

  const roleLabel = user?.profile?.role
    ? ROLE_LABELS[user.profile.role as UserRole] || user.profile.role
    : ''

  const displayName = user?.profile?.full_name
  const initials = displayName
    ? displayName
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : ''

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur transition-all duration-300 sm:px-6',
        sidebarCollapsed ? 'left-16' : 'left-60'
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h2 className="truncate text-card-title font-semibold text-ink sm:text-lg">
            {pageTitle}
          </h2>
          {pageSubtitle && (
            <p className="hidden truncate text-xs text-ink-muted sm:block">{pageSubtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications Dropdown */}
        <div ref={notifRef} className="relative">
          <Button
            variant="ghost"
            size="icon"
            title="Notifikasi"
            aria-label="Notifikasi"
            aria-expanded={notifOpen}
            className="relative text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            onClick={toggleNotif}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-88 max-w-[92vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:w-96">
              {/* Dropdown Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Notifikasi</p>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      {unreadCount} belum dibaca
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Tandai semua dibaca
                  </button>
                )}
              </div>

              {/* Dropdown Body */}
              <div className="max-h-[360px] overflow-y-auto">
                {notifLoading ? (
                  <div className="space-y-3 p-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <Bell className="h-5 w-5" />
                    </div>
                    <p className="mt-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Belum ada notifikasi
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Semua aktivitas alur kerja akan muncul di sini.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {notifications.slice(0, 6).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`flex cursor-pointer items-start gap-3 p-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                          !n.read ? 'bg-primary/[0.02] dark:bg-primary/[0.03]' : ''
                        }`}
                      >
                        {/* Event Icon */}
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${renderIconBg(
                            n.type
                          )}`}
                        >
                          {renderIcon(n.type)}
                        </div>

                        {/* Content Info */}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <p
                              className={`truncate text-xs font-semibold leading-snug ${
                                !n.read
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            )}
                          </div>

                          <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                            {n.contentTitle}
                          </p>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                            <span className="truncate">{n.description}</span>
                            <span>·</span>
                            <span className="shrink-0">{formatRelativeTime(n.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-center dark:border-slate-800 dark:bg-slate-900/50">
                <Link
                  href="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="inline-flex items-center justify-center text-xs font-semibold text-primary hover:underline"
                >
                  Lihat semua notifikasi →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User avatar + info */}
        <div className="flex items-center gap-3 border-l border-border pl-2 sm:pl-3">
          {initials ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
              {initials}
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft">
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
          )}
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium leading-tight text-ink">
              {displayName || 'Loading...'}
            </p>
            <p className="text-xs leading-tight text-ink-muted">{roleLabel}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          title="Logout"
          className="hidden sm:inline-flex"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Logout
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
          className="sm:hidden"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </header>
  )
}
