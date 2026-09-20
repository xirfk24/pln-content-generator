import { apiFetch } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { UserRole } from '@/types'

export type NotificationType =
  | 'APPROVAL'
  | 'REVISION'
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

// Storage key helper for read notification IDs
function getStorageKey(userId?: string | null): string {
  return `pln_read_notif_ids_${userId || 'guest'}`
}

export function getReadNotificationIds(userId?: string | null): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

export function markNotificationAsRead(notifId: string, userId?: string | null): void {
  if (typeof window === 'undefined') return
  try {
    const set = getReadNotificationIds(userId)
    set.add(notifId)
    localStorage.setItem(getStorageKey(userId), JSON.stringify(Array.from(set)))
    window.dispatchEvent(new CustomEvent('pln-notification-update'))
  } catch (err) {
    console.error('Failed to mark notification as read:', err)
  }
}

export function markAllNotificationsAsRead(notifIds: string[], userId?: string | null): void {
  if (typeof window === 'undefined') return
  try {
    const set = getReadNotificationIds(userId)
    notifIds.forEach((id) => set.add(id))
    localStorage.setItem(getStorageKey(userId), JSON.stringify(Array.from(set)))
    window.dispatchEvent(new CustomEvent('pln-notification-update'))
  } catch (err) {
    console.error('Failed to mark all notifications as read:', err)
  }
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
 * Fetch and synthesize actionable event notifications based on the current user's role.
 */
export async function fetchNotifications(
  userId?: string | null,
  role?: UserRole | null
): Promise<AppNotification[]> {
  const readIds = getReadNotificationIds(userId)
  const notifications: AppNotification[] = []
  const seenIds = new Set<string>()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  try {
    // Parallel fetch contents & publications
    const [contentsRes, pubsRes] = await Promise.all([
      apiFetch('/api/contents?include_savings=false'),
      apiFetch('/api/publications'),
    ])

    const contentsData = contentsRes.ok ? await contentsRes.json() : { contents: [] }
    const pubsData = pubsRes.ok ? await pubsRes.json() : { publications: [] }

    const contents: any[] = contentsData.contents || []
    const publications: any[] = pubsData.publications || []

    const isAdmin = role === 'ADMIN'

    // 1. Process Content Status Events
    contents.forEach((c) => {
      const updatedAt = c.updated_at || c.created_at || new Date().toISOString()
      const title = c.title || 'Konten Tanpa Judul'

      if (isAdmin) {
        // ADMIN NOTIFICATIONS:
        // A. Waiting for concept review
        if (c.status === 'PENDING_REVIEW') {
          const id = `notif-admin-pending-${c.id}-${updatedAt.slice(0, 10)}`
          if (!seenIds.has(id)) {
            seenIds.add(id)
            notifications.push({
              id,
              contentId: c.id,
              type: 'APPROVAL',
              priority: 'HIGH',
              title: 'Konten menunggu persetujuan',
              contentTitle: title,
              description: 'Admin perlu melakukan review',
              timestamp: updatedAt,
              actionUrl: `/content/${c.id}`,
              needsAction: true,
              read: readIds.has(id),
            })
          }
        }

        // B. Waiting for production review
        if (c.status === 'PENDING_PRODUCTION_REVIEW') {
          const id = `notif-admin-prod-${c.id}-${updatedAt.slice(0, 10)}`
          if (!seenIds.has(id)) {
            seenIds.add(id)
            notifications.push({
              id,
              contentId: c.id,
              type: 'APPROVAL',
              priority: 'HIGH',
              title: 'Konten hasil revisi siap ditinjau',
              contentTitle: title,
              description: 'Tinjau hasil produksi sebelum siap publikasi',
              timestamp: updatedAt,
              actionUrl: `/content/${c.id}`,
              needsAction: true,
              read: readIds.has(id),
            })
          }
        }
      } else {
        // STAFF NOTIFICATIONS:
        // A. Revision requested
        if (c.status === 'REVISION_REQUIRED') {
          const id = `notif-staff-rev-${c.id}-${updatedAt.slice(0, 10)}`
          if (!seenIds.has(id)) {
            seenIds.add(id)
            notifications.push({
              id,
              contentId: c.id,
              type: 'REVISION',
              priority: 'HIGH',
              title: 'Konten perlu direvisi',
              contentTitle: title,
              description: 'Lihat catatan revisi dari admin reviewer',
              timestamp: updatedAt,
              actionUrl: `/content/${c.id}`,
              needsAction: true,
              read: readIds.has(id),
            })
          }
        }

        // B. Concept approved
        if (c.status === 'APPROVED') {
          const id = `notif-staff-appr-${c.id}-${updatedAt.slice(0, 10)}`
          if (!seenIds.has(id)) {
            seenIds.add(id)
            notifications.push({
              id,
              contentId: c.id,
              type: 'APPROVAL',
              priority: 'MEDIUM',
              title: 'Konten disetujui',
              contentTitle: title,
              description: 'Konsep disetujui, siap untuk produksi konten',
              timestamp: updatedAt,
              actionUrl: `/content/${c.id}`,
              needsAction: true,
              read: readIds.has(id),
            })
          }
        }

        // C. Ready to publish
        if (c.status === 'READY_TO_PUBLISH') {
          const id = `notif-staff-ready-${c.id}-${updatedAt.slice(0, 10)}`
          if (!seenIds.has(id)) {
            seenIds.add(id)
            notifications.push({
              id,
              contentId: c.id,
              type: 'APPROVAL',
              priority: 'MEDIUM',
              title: 'Konten siap publikasi',
              contentTitle: title,
              description: 'Konten telah disetujui dan siap ditayangkan',
              timestamp: updatedAt,
              actionUrl: `/content/${c.id}`,
              needsAction: false,
              read: readIds.has(id),
            })
          }
        }
      }
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
            actionUrl: `/publishing`,
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
            actionUrl: `/publishing`,
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
              actionUrl: `/publishing`,
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
              actionUrl: `/publishing`,
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
              actionUrl: `/publishing`,
              needsAction: false,
              read: readIds.has(id),
            })
          }
        }
      }
    })

    // Sort notifications:
    // 1. Unread first, then by priority (HIGH > MEDIUM > LOW), then most recent date
    const priorityWeight: Record<NotificationPriority, number> = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    }

    notifications.sort((a, b) => {
      // Prioritize unread
      if (!a.read && b.read) return -1
      if (a.read && !b.read) return 1

      // Then priority
      const pDiff = priorityWeight[b.priority] - priorityWeight[a.priority]
      if (pDiff !== 0) return pDiff

      // Then timestamp descending
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    return notifications
  } catch (err) {
    console.error('fetchNotifications error:', err)
    return []
  }
}
