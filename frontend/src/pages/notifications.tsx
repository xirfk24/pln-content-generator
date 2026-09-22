'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from '@/compat/next'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Bell,
  CheckCheck,
  RotateCcw,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Send,
  XCircle,
  ArrowRight,
  RefreshCw,
  Inbox,
  AlertCircle,
} from 'lucide-react'
import {
  type AppNotification,
  type NotificationType,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  formatRelativeTime,
  getTimeGroup,
} from '@/lib/notifications'
import type { UserRole } from '@/types'

type TabType = 'ALL' | 'UNREAD' | 'ACTIONABLE'

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('ALL')
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const meRes = await apiFetch('/api/auth/me')
      let uId: string | null = null
      let uRole: UserRole | null = null
      if (meRes.ok) {
        const meData = await meRes.json()
        uId = meData?.user?.id || null
        uRole = meData?.user?.profile?.role || null
        setUserId(uId)
        setUserRole(uRole)
      }

      const notifs = await fetchNotifications(uId, uRole)
      setNotifications(notifs)
    } catch (err) {
      console.error('Failed to load notifications page:', err)
      setError('Notifikasi belum dapat dimuat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    const handleUpdate = () => {
      fetchNotifications(userId, userRole).then(setNotifications)
    }
    window.addEventListener('pln-notification-update', handleUpdate)
    return () => window.removeEventListener('pln-notification-update', handleUpdate)
  }, [loadData, userId, userRole])

  // Counts
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )
  const actionableCount = useMemo(
    () => notifications.filter((n) => n.needsAction).length,
    [notifications]
  )

  // Filtered List
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === 'UNREAD') return !n.read
      if (activeTab === 'ACTIONABLE') return n.needsAction
      return true
    })
  }, [notifications, activeTab])

  // Group by Time
  const timeGroups = useMemo(() => {
    const groups: Record<string, AppNotification[]> = {
      'Hari Ini': [],
      'Kemarin': [],
      'Minggu Ini': [],
      'Lebih Lama': [],
    }

    filteredNotifications.forEach((n) => {
      const group = getTimeGroup(n.timestamp)
      groups[group].push(n)
    })

    return groups
  }, [filteredNotifications])

  // Mark all as read
  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id)
    markAllNotificationsAsRead(allIds)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  // Handle single notification click
  const handleNotificationClick = (n: AppNotification) => {
    if (!n.read) {
      markNotificationAsRead(n.id)
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
      )
    }
    router.push(n.actionUrl)
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Notifikasi
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Informasi dan aktivitas terbaru yang membutuhkan perhatian Anda.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="self-start text-xs font-medium text-slate-700 sm:self-auto dark:text-slate-200"
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
            Tandai semua dibaca
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'ALL'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span>Semua</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'ALL'
                ? 'bg-primary/10 text-primary'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {notifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('UNREAD')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'UNREAD'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span>Belum Dibaca</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'UNREAD'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {unreadCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ACTIONABLE')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'ACTIONABLE'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span>Perlu Tindakan</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'ACTIONABLE'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {actionableCount}
          </span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-800">
          <AlertCircle className="h-10 w-10 text-rose-500" />
          <p className="mt-3 font-semibold text-slate-800 dark:text-slate-200">{error}</p>
          <Button size="sm" onClick={loadData} className="mt-4">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Coba Lagi
          </Button>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
            {activeTab === 'UNREAD' ? (
              <CheckCheck className="h-7 w-7 text-emerald-500" />
            ) : (
              <Bell className="h-7 w-7 text-slate-400" />
            )}
          </div>
          <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
            {activeTab === 'UNREAD'
              ? 'Semua sudah dibaca'
              : activeTab === 'ACTIONABLE'
              ? 'Tidak ada tindakan tertunda'
              : 'Belum ada notifikasi'}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {activeTab === 'UNREAD'
              ? 'Kamu tidak memiliki notifikasi yang belum dibaca saat ini.'
              : activeTab === 'ACTIONABLE'
              ? 'Semua tugas dan peninjauan konten Anda telah terselesaikan.'
              : 'Semua aktivitas terbaru terkait alur kerja konten akan muncul di sini.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(['Hari Ini', 'Kemarin', 'Minggu Ini', 'Lebih Lama'] as const).map((groupName) => {
            const groupItems = timeGroups[groupName]
            if (!groupItems || groupItems.length === 0) return null

            return (
              <div key={groupName} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {groupName}
                  </h2>
                  <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                </div>

                <div className="space-y-2.5">
                  {groupItems.map((n) => {
                    return (
                      <Card
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`group cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm ${
                          !n.read
                            ? 'border-primary/30 bg-primary/[0.02] dark:border-primary/30 dark:bg-primary/[0.03]'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <CardContent className="flex items-start gap-3.5 p-4 sm:items-center sm:gap-4">
                          {/* Event Icon */}
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${renderIconBg(
                              n.type
                            )}`}
                          >
                            {renderIcon(n.type)}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h3
                                className={`text-[13px] font-semibold leading-tight ${
                                  !n.read
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {n.title}
                              </h3>
                              {!n.read && (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </div>

                            <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                              {n.contentTitle}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span>{n.description}</span>
                              <span>·</span>
                              <span className="text-[11px]">
                                {formatRelativeTime(n.timestamp)}
                              </span>
                            </div>
                          </div>

                          {/* Action Arrow */}
                          <div className="hidden shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-primary sm:block">
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
