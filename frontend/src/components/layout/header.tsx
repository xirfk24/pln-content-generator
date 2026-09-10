'use client'

import { apiFetch } from '@/lib/api'
import * as React from 'react'
import { useRouter, usePathname } from '@/compat/next'
import { Bell, LogOut, Menu, User, CheckSquare, AlertCircle, Send, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/constants'
import type { UserRole } from '@/types'
import Link from '@/compat/next'

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

interface NotifItem {
  id: string
  title: string
  status: string
  updatedAt: string
}

const STATUS_NOTIF: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PENDING_REVIEW:    { label: 'Menunggu review',   icon: <Clock className="h-3.5 w-3.5" />,        color: 'text-warning' },
  APPROVED:          { label: 'Menunggu final',    icon: <CheckSquare className="h-3.5 w-3.5" />,  color: 'text-info' },
  REVISION_REQUIRED: { label: 'Perlu revisi',      icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'text-danger' },
  READY_TO_PUBLISH:  { label: 'Siap publish',      icon: <Send className="h-3.5 w-3.5" />,        color: 'text-success' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'baru saja'
  if (mins < 60) return `${mins} mnt lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs} jam lalu`
  return `${Math.floor(hrs / 24)} hr lalu`
}

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/content/calendar': 'Content Calendar',
  '/content/planning': 'Content Planning',
  '/content/planning/new': 'New Content',
  '/content/import': 'Import Konten',
  '/publishing': 'Publishing Tracker',
  '/workflow/tasks': 'My Tasks',
  '/workflow/approval': 'Approval Queue',
  '/analytics': 'Analytics Overview',
  '/analytics/performance': 'Performance Analytics',
  '/analytics/insights': 'AI Insights',
  '/reports': 'Reports',
  '/ai': 'AI Assistant',
  '/admin/users': 'Users',
  '/admin/pillars': 'Tema',
  '/admin/categories': 'Categories',
  '/admin/platforms': 'Platforms',
}

const ROUTE_SUBTITLES: Record<string, string> = {
  '/dashboard': 'Content activity, workflow overview & performance summary',
  '/content/calendar': 'Monthly content scheduling calendar',
  '/content/planning': 'Manage and track all planned content',
  '/content/import': 'Upload CSV untuk impor massal',
  '/publishing': 'Track publications across platforms',
  '/workflow/tasks': 'Your assigned content tasks',
  '/workflow/approval': 'Review and approve content',
  '/analytics': 'Performance metrics across platforms',
  '/analytics/performance': 'Detailed content performance ranking',
  '/analytics/insights': 'AI-powered performance analysis',
  '/reports': 'Export and filter content reports',
  '/ai': 'AI-powered content tools',
  '/admin/users': 'Manage user accounts and roles',
  '/admin/pillars': 'Kelola topik/tema konten',
  '/admin/categories': 'Manage content categories',
  '/admin/platforms': 'Manage publishing platforms',
}

function usePageTitle(pathname: string): string {
  return React.useMemo(() => {
    if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
    if (pathname.startsWith('/content/planning/')) return 'Content Detail'
    if (pathname.startsWith('/content/')) {
      return pathname.endsWith('/edit') ? 'Edit Content' : 'Content Detail'
    }
    return 'Content Management System'
  }, [pathname])
}

function usePageSubtitle(pathname: string): string {
  return React.useMemo(() => {
    if (ROUTE_SUBTITLES[pathname]) return ROUTE_SUBTITLES[pathname]
    if (pathname.startsWith('/content/')) return 'View and manage content details'
    return ''
  }, [pathname])
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = React.useState<CurrentUser | null>(null)

  // Notifications
  const [notifOpen, setNotifOpen]       = React.useState(false)
  const [notifs, setNotifs]             = React.useState<NotifItem[]>([])
  const [notifLoading, setNotifLoading] = React.useState(false)
  const notifRef = React.useRef<HTMLDivElement>(null)

  const pageTitle = usePageTitle(pathname)
  const pageSubtitle = usePageSubtitle(pathname)

  React.useEffect(() => {
    apiFetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user && setUser(data.user))
      .catch(() => {})
  }, [])

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

  async function loadNotifs() {
    setNotifLoading(true)
    try {
      const [qRes, tRes] = await Promise.all([
        apiFetch('/api/workflow/approval-queue'),
        apiFetch('/api/workflow/tasks'),
      ])
      const items: NotifItem[] = []
      const seen = new Set<string>()
      const push = (c: { id: string; title: string; status: string; updated_at: string }) => {
        if (!seen.has(c.id)) { seen.add(c.id); items.push({ id: c.id, title: c.title, status: c.status, updatedAt: c.updated_at }) }
      }
      if (qRes.ok) { const d = await qRes.json(); (d.queue || []).forEach(push) }
      if (tRes.ok) {
        const d = await tRes.json()
        ;(d.revisions      || []).forEach(push)
        ;(d.readyToPublish || []).forEach(push)
        ;(d.submitted      || []).forEach(push)
      }
      // Sort: most recently updated first
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      setNotifs(items)
    } catch { /* ignore */ } finally {
      setNotifLoading(false)
    }
  }

  function toggleNotif() {
    if (!notifOpen) loadNotifs()
    setNotifOpen((v) => !v)
  }

  async function handleLogout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // proceed with client-side redirect anyway
    }
    router.push('/login')
    router.refresh()
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
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <Button
            variant="ghost"
            size="icon"
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className="relative"
            onClick={toggleNotif}
          >
            <Bell className="h-4 w-4" />
            {notifs.length > 0 && (
              <span className="absolute right-1 top-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
              </span>
            )}
          </Button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-surface shadow-lg">
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="text-sm font-semibold text-ink">Notifikasi</p>
                {notifs.length > 0 && (
                  <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">
                    {notifs.length}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="max-h-80 overflow-y-auto">
                {notifLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-sm text-ink-muted">Memuat...</span>
                  </div>
                ) : notifs.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="mx-auto mb-2 h-8 w-8 text-ink-muted" aria-hidden="true" />
                    <p className="text-sm text-ink-muted">Tidak ada notifikasi aktif</p>
                  </div>
                ) : (
                  <ul>
                    {notifs.map((n) => {
                      const meta = STATUS_NOTIF[n.status]
                      return (
                        <li key={n.id} className="border-b last:border-0">
                          <Link
                            href={`/content/${n.id}`}
                            onClick={() => setNotifOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
                          >
                            <span className={cn('mt-0.5 flex-shrink-0', meta?.color ?? 'text-ink-muted')}>
                              {meta?.icon ?? <Bell className="h-3.5 w-3.5" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink">{n.title}</p>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className={cn('text-xs', meta?.color ?? 'text-ink-muted')}>
                                  {meta?.label ?? n.status}
                                </span>
                                <span className="text-xs text-ink-muted">·</span>
                                <span className="text-xs text-ink-muted">{timeAgo(n.updatedAt)}</span>
                              </div>
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* Footer */}
              {notifs.length > 0 && (
                <div className="border-t px-4 py-2">
                  <Link
                    href="/workflow/tasks"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Lihat semua tugas →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User avatar + info */}
        <div className="flex items-center gap-2">
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
