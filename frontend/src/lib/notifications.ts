import { apiFetch } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { UserRole } from '@/types'

export type NotificationType =
  | 'APPROVAL'
  | 'REVISION'
  | 'REJECTED'
  | 'SCHEDULE'
  | 'OVERDUE'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'GENERAL'

export type NotificationPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export interface AppNotification {
  id: string
  contentId: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  contentTitle: string
  description: string
  timestamp: string // ISO string or valid date
  actionUrl: string
  needsAction: boolean
  read: boolean
}

// Read state notifikasi persist di DB lewat /api/notifications/read,
// jadi status "dibaca" ikut user antar device/browser.

/** Tandai satu notifikasi dibaca (fire-and-forget; UI sudah optimistic). */
export function markNotificationAsRead(notifId: string): void {
  postMarkRead([notifId])
}

/** Tandai banyak notifikasi dibaca sekaligus (fire-and-forget). */
export function markAllNotificationsAsRead(notifIds: string[]): void {
  postMarkRead(notifIds)
}

function postMarkRead(ids: string[]): void {
  apiFetch('/api/notifications/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
    .then(() => window.dispatchEvent(new CustomEvent('pln-notification-update')))
    .catch((err) => console.error('Failed to mark notifications as read:', err))
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'baru saja'

  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} mnt lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Kemarin'
  if (days < 7) return `${days} hari lalu`
  return formatDate(dateStr)
}

export function getTimeGroup(dateStr: string): 'Hari Ini' | 'Kemarin' | 'Minggu Ini' | 'Lebih Lama' {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Hari Ini'

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000
  const weekStart = todayStart - 6 * 86400000

  const time = date.getTime()
  if (time >= todayStart) return 'Hari Ini'
  if (time >= yesterdayStart) return 'Kemarin'
  if (time >= weekStart) return 'Minggu Ini'
  return 'Lebih Lama'
}

/**
 * Fetch notifications: event workflow (revisi/ditolak/disetujui) dari
 * /api/notifications (berbasis approval_histories, jadi event lama tetap
 * terlihat), plus jadwal publikasi dari /api/publications.
 */
export async function fetchNotifications(
  userId?: string | null,
  role?: UserRole | null
): Promise<AppNotification[]> {
  const notifications: AppNotification[] = []
  const seenIds = new Set<string>()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  try {
    // Parallel fetch events, read-ids & publications
    const [eventsRes, readRes, pubsRes] = await Promise.all([
      apiFetch('/api/notifications'),
      apiFetch('/api/notifications/read'),
      apiFetch('/api/publications'),
    ])

    const eventsData = eventsRes.ok ? await eventsRes.json() : { notifications: [] }
    const readData = readRes.ok ? await readRes.json() : { ids: [] }
    const pubsData = pubsRes.ok ? await pubsRes.json() : { publications: [] }

    const events: any[] = eventsData.notifications || []
    const readIds = new Set<string>(Array.isArray(readData.ids) ? readData.ids : [])
    const publications: any[] = pubsData.publications || []

    const isAdmin = role === 'ADMIN'

    // 1. Workflow events (revisi, ditolak, disetujui, menunggu persetujuan)
    events.forEach((e) => {
      const id = `notif-event-${e.id}`
      if (seenIds.has(id)) return
      seenIds.add(id)
      notifications.push({
        id,
        contentId: e.content_id,
        type: e.type,
        priority: e.priority,
        title: e.title,
        contentTitle: e.content_title || 'Konten Tanpa Judul',
        description: e.comment ? `Catatan: ${e.comment}` : e.description,
        timestamp: e.timestamp,
        actionUrl: e.action_url || `/content/${e.content_id}`,
        needsAction: e.needs_action,
        read: readIds.has(id),
      })
    })

    // 2. Process Publication Schedules & Deadlines
    publications.forEach((pub) => {
      const contentId = pub.content_id || pub.id
      const contentTitle = pub.content?.title || 'Konten Publikasi'
      const plannedDate = pub.content?.planned_date || pub.planned_publish_date || null
      const updatedAt = pub.updated_at || pub.created_at || new Date().toISOString()
      const status = pub.status

      if (status === 'CANCELLED' || status === 'CANCEL') {
        const id = `notif-pub-cancel-${pub.id}`
        if (!seenIds.has(id)) {
          seenIds.add(id)
          notifications.push({
            id,
            contentId,
            type: 'CANCELLED',
            priority: 'LOW',
            title: 'Konten dibatalkan',
            contentTitle,
            description: pub.cancel_reason ? `Alasan: ${pub.cancel_reason}` : 'Publikasi konten dibatalkan',
            timestamp: updatedAt,
            actionUrl: `/content/${contentId}`,
            needsAction: false,
            read: readIds.has(id),
          })
        }
        return
      }

      if (status === 'PUBLISHED') {
        const id = `notif-pub-done-${pub.id}`
        if (!seenIds.has(id)) {
          seenIds.add(id)
          notifications.push({
            id,
            contentId,
            type: 'PUBLISHED',
            priority: 'LOW',
            title: 'Konten berhasil dipublikasikan',
            contentTitle,
            description: pub.actual_publish_date ? `Ditayangkan pada ${formatDate(pub.actual_publish_date)}` : 'Konten telah ditayangkan',
            timestamp: pub.actual_publish_date || updatedAt,
            actionUrl: `/content/${contentId}`,
            needsAction: false,
            read: readIds.has(id),
          })
        }
        return
      }

      // If PLANNED or DELAYED
      if (plannedDate) {
        if (plannedDate < todayStr || status === 'DELAYED') {
          // Overdue
          const id = `notif-pub-overdue-${pub.id}`
          if (!seenIds.has(id)) {
            seenIds.add(id)
            notifications.push({
              id,
              contentId,
              type: 'OVERDUE',
              priority: 'HIGH',
              title: isAdmin ? 'Konten melewati jadwal publikasi' : 'Konten belum dipublikasikan sesuai jadwal',
              contentTitle,
              description: `Jadwal (${formatDate(plannedDate)}) telah terlewati`,
              timestamp: updatedAt,
              actionUrl: `/content/${contentId}`,
              needsAction: true,
              read: readIds.has(id),
            })
          }
        } else if (plannedDate === todayStr) {
          // Hari H
          const id = `notif-pub-today-${pub.id}`
          if (!seenIds.has(id)) {
            seenIds.add(id)
            notifications.push({
              id,
              contentId,
              type: 'SCHEDULE',
              priority: 'HIGH',
              title: 'Jadwal publikasi hari ini',
              contentTitle,
              description: 'Dijadwalkan tayang hari ini, pastikan siap publikasi',
              timestamp: updatedAt,
              actionUrl: `/content/${contentId}`,
              needsAction: true,
              read: readIds.has(id),
            })
          }
        } else if (plannedDate === tomorrowStr) {
          // H-1
          const id = `notif-pub-tomorrow-${pub.id}`
          if (!seenIds.has(id)) {
            seenIds.add(id)
            notifications.push({
              id,
              contentId,
              type: 'SCHEDULE',
              priority: 'MEDIUM',
              title: 'Jadwal publikasi besok',
              contentTitle,
              description: `Dijadwalkan ${formatDate(plannedDate)}`,
              timestamp: updatedAt,
              actionUrl: `/content/${contentId}`,
              needsAction: false,
              read: readIds.has(id),
            })
          }
        }
      }
    })

    // Sort: unread first, then most recent on top.
    // (Priority tidak lagi ikut menyortir supaya notifikasi terbaru selalu
    // tampak paling atas dalam grupnya — urutan = paling baru dulu.)
    notifications.sort((a, b) => {
      if (!a.read && b.read) return -1
      if (a.read && !b.read) return 1
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    return notifications
  } catch (err) {
    console.error('fetchNotifications error:', err)
    return []
  }
}

