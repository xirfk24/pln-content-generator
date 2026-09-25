// Notifikasi publikasi per KONTEN (satu konten multi-platform = satu notif
// per jenis), bukan per baris publication yang bikin notif numpuk.
// Pure & tanpa import supaya bisa dicek langsung dengan Node
// (lihat pub-notifs.selfcheck.mjs).

export type PubNotifKind = 'cancel' | 'done' | 'overdue' | 'today' | 'tomorrow'

export interface PubLike {
  id: string
  content_id?: string | null
  status?: string | null
  cancel_reason?: string | null
  actual_publish_date?: string | null
  planned_publish_date?: string | null
  updated_at?: string | null
  created_at?: string | null
  content?: { title?: string | null; planned_date?: string | null } | null
  platform?: { name?: string | null } | null
}

export interface RawPubNotification {
  kind: PubNotifKind
  contentId: string
  contentTitle: string
  type: 'CANCELLED' | 'PUBLISHED' | 'OVERDUE' | 'SCHEDULE'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  description: string
  timestamp: string
  needsAction: boolean
}

export interface PubNotifContext {
  todayStr: string
  tomorrowStr: string
  isAdmin: boolean
  formatDate: (dateStr: string) => string
}

export function buildPublicationNotifications(
  publications: PubLike[],
  ctx: PubNotifContext
): RawPubNotification[] {
  // 1. Satu konten = satu grup publication (per platform)
  const groups = new Map<string, PubLike[]>()
  for (const pub of publications) {
    const contentId = pub.content_id || pub.id
    const list = groups.get(contentId)
    if (list) list.push(pub)
    else groups.set(contentId, [pub])
  }

  const result: RawPubNotification[] = []
  groups.forEach((pubs, contentId) => {
    const contentTitle = pubs[0].content?.title || 'Konten Publikasi'

    // 2. Klasifikasi tiap publication ke satu jenis notif (kondisi sama
    // dengan implementasi lama yang per-publication)
    const buckets: Record<PubNotifKind, PubLike[]> = {
      cancel: [],
      done: [],
      overdue: [],
      today: [],
      tomorrow: [],
    }
    for (const pub of pubs) {
      const status = pub.status
      if (status === 'CANCELLED' || status === 'CANCEL') {
        buckets.cancel.push(pub)
        continue
      }
      if (status === 'PUBLISHED') {
        buckets.done.push(pub)
        continue
      }
      // PLANNED / DELAYED: notifikasi jadwal
      const plannedDate = pub.content?.planned_date || pub.planned_publish_date || null
      if (!plannedDate) continue
      if (plannedDate < ctx.todayStr || status === 'DELAYED') buckets.overdue.push(pub)
      else if (plannedDate === ctx.todayStr) buckets.today.push(pub)
      else if (plannedDate === ctx.tomorrowStr) buckets.tomorrow.push(pub)
    }

    const updatedAt = (p: PubLike) => p.updated_at || p.created_at
    // ISO/date string: urutan leksikografis = urutan kronologis
    const latest = (bucket: PubLike[], pick: (p: PubLike) => string | null | undefined): string => {
      let best = ''
      for (const p of bucket) {
        const v = pick(p) || ''
        if (v > best) best = v
      }
      return best || new Date().toISOString()
    }
    const names = (bucket: PubLike[]): string => {
      const set = new Set<string>()
      for (const p of bucket) if (p.platform?.name) set.add(p.platform.name)
      const list = Array.from(set)
      return list.length > 0 ? list.join(', ') : `${bucket.length} platform`
    }
    const plannedOf = (p: PubLike) => p.content?.planned_date || p.planned_publish_date || ''

    // 3. Satu notif per jenis yang terisi, dengan daftar platform di deskripsi
    if (buckets.cancel.length > 0) {
      const reason = buckets.cancel.map((p) => p.cancel_reason).find(Boolean)
      result.push({
        kind: 'cancel',
        contentId,
        contentTitle,
        type: 'CANCELLED',
        priority: 'LOW',
        title: 'Konten dibatalkan',
        description: `Dibatalkan di ${names(buckets.cancel)}${reason ? ` — Alasan: ${reason}` : ''}`,
        timestamp: latest(buckets.cancel, updatedAt),
        needsAction: false,
      })
    }

    if (buckets.done.length > 0) {
      result.push({
        kind: 'done',
        contentId,
        contentTitle,
        type: 'PUBLISHED',
        priority: 'LOW',
        title: 'Konten berhasil dipublikasikan',
        description: `Ditayangkan di ${names(buckets.done)}`,
        timestamp: latest(buckets.done, (p) => p.actual_publish_date || updatedAt(p)),
        needsAction: false,
      })
    }

    if (buckets.overdue.length > 0) {
      result.push({
        kind: 'overdue',
        contentId,
        contentTitle,
        type: 'OVERDUE',
        priority: 'HIGH',
        title: ctx.isAdmin
          ? 'Konten melewati jadwal publikasi'
          : 'Konten belum dipublikasikan sesuai jadwal',
        description: `Jadwal (${ctx.formatDate(plannedOf(buckets.overdue[0]))}) terlewati di ${names(buckets.overdue)}`,
        timestamp: latest(buckets.overdue, updatedAt),
        needsAction: true,
      })
    }

    if (buckets.today.length > 0) {
      result.push({
        kind: 'today',
        contentId,
        contentTitle,
        type: 'SCHEDULE',
        priority: 'HIGH',
        title: 'Jadwal publikasi hari ini',
        description: `Dijadwalkan tayang hari ini di ${names(buckets.today)}, pastikan siap publikasi`,
        timestamp: latest(buckets.today, updatedAt),
        needsAction: true,
      })
    }

    if (buckets.tomorrow.length > 0) {
      result.push({
        kind: 'tomorrow',
        contentId,
        contentTitle,
        type: 'SCHEDULE',
        priority: 'MEDIUM',
        title: 'Jadwal publikasi besok',
        description: `Dijadwalkan ${ctx.formatDate(plannedOf(buckets.tomorrow[0]))} di ${names(buckets.tomorrow)}`,
        timestamp: latest(buckets.tomorrow, updatedAt),
        needsAction: false,
      })
    }
  })

  return result
}
