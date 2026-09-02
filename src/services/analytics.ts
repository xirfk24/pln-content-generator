'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateEngagementRate } from '@/lib/utils'
import type { ContentStatus } from '@/types'

export interface AnalyticsFilters {
  date_from?: string
  date_to?: string
  platform_id?: string
  pillar_id?: string
  status?: string
}

export interface DashboardKPIs {
  content: {
    total: number
    planned: number
    inProgress: number
    pendingReview: number
    approved: number
    readyToPublish: number
    published: number
    rescheduled: number
    notRealized: number
  }
  performance: {
    totalViews: number
    totalLikes: number
    totalComments: number
    totalShares: number
    totalSaves: number
    totalReach: number
    avgEngagementRate: number
  }
}

export interface ContentStatusBreakdown {
  status: string
  label: string
  count: number
}

export interface PlatformPerformance {
  platform: string
  contentCount: number
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  engagementRate: number
}

export interface PillarPerformance {
  pillar: string
  contentCount: number
  publishedCount: number
  views: number
  reach: number
  avgViews: number
  totalEngagement: number
  avgEngagementRate: number
}

export interface MonthlyTrend {
  month: string
  label: string
  planned: number
  published: number
  realizationRate: number
  views: number
  likes: number
  engagementRate: number
}

export interface TopContent {
  contentId: string
  title: string
  platform: string
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  engagementRate: number
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  PENDING_REVIEW: 'Pending Review',
  REVISION_REQUIRED: 'Revision Required',
  APPROVED: 'Approved',
  READY_TO_PUBLISH: 'Ready to Publish',
  PUBLISHED: 'Published',
  RESCHEDULED: 'Rescheduled',
  NOT_REALIZED: 'Not Realized',
}

function buildContentFilter(filters: AnalyticsFilters) {
  const supabase = createClient()

  let query = supabase
    .from('contents')
    .select('*, pillar:pillars(*), platform:platforms(*)')

  if (filters.date_from) query = query.gte('planned_date', filters.date_from)
  if (filters.date_to) query = query.lte('planned_date', filters.date_to)
  if (filters.pillar_id) query = query.eq('pillar_id', filters.pillar_id)
  if (filters.platform_id) query = query.eq('platform_id', filters.platform_id)
  if (filters.status) query = query.eq('status', filters.status)

  return query
}

export async function getDashboardKPIs(filters: AnalyticsFilters): Promise<DashboardKPIs> {
  const supabase = createClient()

  let contentQuery = supabase.from('contents').select('id, status, planned_date, pillar_id')
  if (filters.date_from) contentQuery = contentQuery.gte('planned_date', filters.date_from)
  if (filters.date_to) contentQuery = contentQuery.lte('planned_date', filters.date_to)
  if (filters.pillar_id) contentQuery = contentQuery.eq('pillar_id', filters.pillar_id)

  const { data: contents } = await contentQuery

  const all = contents || []
  const countBy = (status: ContentStatus) =>
    all.filter((c) => c.status === status).length

  const contentIds = all.map((c) => c.id)

  const metricsTotals = {
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalSaves: 0,
    totalReach: 0,
  }
  let avgEngagementRate = 0

  if (contentIds.length > 0) {
    let pubQuery = supabase
      .from('publications')
      .select('id, content_id, platform_id')
      .in('content_id', contentIds)
    if (filters.platform_id) pubQuery = pubQuery.eq('platform_id', filters.platform_id)

    const { data: publications } = await pubQuery
    const pubIds = (publications || []).map((p) => p.id)

    if (pubIds.length > 0) {
      const { data: metrics } = await supabase
        .from('performance_metrics')
        .select('*')
        .in('publication_id', pubIds)

      const allMetrics = metrics || []

      const rates: number[] = []
      for (const m of allMetrics) {
        metricsTotals.totalViews += m.views
        metricsTotals.totalLikes += m.likes
        metricsTotals.totalComments += m.comments
        metricsTotals.totalShares += m.shares
        metricsTotals.totalSaves += m.saves
        metricsTotals.totalReach += m.reach

        const rate = calculateEngagementRate(m)
        if (m.reach > 0) rates.push(rate)
      }

      avgEngagementRate =
        rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
    }
  }

  return {
    content: {
      total: all.length,
      planned: countBy('PLANNED'),
      inProgress: countBy('IN_PROGRESS'),
      pendingReview: countBy('PENDING_REVIEW'),
      approved: countBy('APPROVED'),
      readyToPublish: countBy('READY_TO_PUBLISH'),
      published: countBy('PUBLISHED'),
      rescheduled: countBy('RESCHEDULED'),
      notRealized: countBy('NOT_REALIZED'),
    },
    performance: {
      ...metricsTotals,
      avgEngagementRate,
    },
  }
}

export async function getContentStatusBreakdown(
  filters: AnalyticsFilters
): Promise<ContentStatusBreakdown[]> {
  const query = buildContentFilter(filters)
  const { data } = await query.select('status')
  const all = data || []

  const counts = new Map<string, number>()
  all.forEach((c) => {
    counts.set(c.status, (counts.get(c.status) || 0) + 1)
  })

  return Array.from(counts.entries()).map(([status, count]) => ({
    status,
    label: STATUS_LABELS[status] || status,
    count,
  }))
}

export async function getPlatformPerformance(
  filters: AnalyticsFilters
): Promise<PlatformPerformance[]> {
  const supabase = createClient()

  const contentQuery = buildContentFilter(filters)
  const { data: contents } = await contentQuery.select('id, platform:platforms(name)')
  const all = contents || []

  const platformContentCount = new Map<string, number>()
  const contentPlatform = new Map<string, string>()
  all.forEach((c) => {
    const name = (c.platform as { name?: string } | null)?.name || 'Unknown'
    platformContentCount.set(name, (platformContentCount.get(name) || 0) + 1)
    contentPlatform.set(c.id, name)
  })

  const contentIds = all.map((c) => c.id)
  const rows = new Map<string, PlatformPerformance>()

  Array.from(platformContentCount.entries()).forEach(([name, count]) => {
    rows.set(name, {
      platform: name,
      contentCount: count,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      reach: 0,
      engagementRate: 0,
    })
  })

  if (contentIds.length > 0) {
    const { data: publications } = await supabase
      .from('publications')
      .select('id, content_id')
      .in('content_id', contentIds)

    const pubToPlatform = new Map<string, string>()
    ;(publications || []).forEach((p) => {
      const name = contentPlatform.get(p.content_id) || 'Unknown'
      pubToPlatform.set(p.id, name)
    })

    const pubIds = Array.from(pubToPlatform.keys())

    if (pubIds.length > 0) {
      const { data: metrics } = await supabase
        .from('performance_metrics')
        .select('*')
        .in('publication_id', pubIds)

      for (const m of metrics || []) {
        const name = pubToPlatform.get(m.publication_id)
        if (!name) continue
        const row = rows.get(name)
        if (!row) continue

        row.views += m.views
        row.likes += m.likes
        row.comments += m.comments
        row.shares += m.shares
        row.saves += m.saves
        row.reach += m.reach
      }
    }
  }

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      engagementRate:
        row.reach > 0
          ? ((row.likes + row.comments + row.shares + row.saves) / row.reach) * 100
          : 0,
    }))
    .sort((a, b) => b.views - a.views)
}

export async function getPillarPerformance(
  filters: AnalyticsFilters
): Promise<PillarPerformance[]> {
  const supabase = createClient()

  const contentQuery = buildContentFilter(filters)
  const { data: contents } = await contentQuery.select(
    'id, status, pillar:pillars(name)'
  )
  const all = contents || []

  const rows = new Map<string, PillarPerformance>()

  all.forEach((c) => {
    const name = (c.pillar as { name?: string } | null)?.name || 'Unknown'
    if (!rows.has(name)) {
      rows.set(name, {
        pillar: name,
        contentCount: 0,
        publishedCount: 0,
        views: 0,
        reach: 0,
        avgViews: 0,
        totalEngagement: 0,
        avgEngagementRate: 0,
      })
    }
    const row = rows.get(name)!
    row.contentCount += 1
    if (c.status === 'PUBLISHED') row.publishedCount += 1
  })

  const { data: publications } = await supabase
    .from('publications')
    .select('id, content_id')
    .in('content_id', all.map((c) => c.id))

  const pubToContent = new Map<string, string>()
  ;(publications || []).forEach((p) => pubToContent.set(p.id, p.content_id))

  const pubIds = Array.from(pubToContent.keys())

  if (pubIds.length > 0) {
    const { data: metrics } = await supabase
      .from('performance_metrics')
      .select('*')
      .in('publication_id', pubIds)

    for (const m of metrics || []) {
      const contentId = pubToContent.get(m.publication_id)
      if (!contentId) continue
      const content = all.find((c) => c.id === contentId)
      const name = (content?.pillar as { name?: string } | null)?.name || 'Unknown'
      const row = rows.get(name)
      if (!row) continue

      row.views += m.views
      row.reach += m.reach
      row.totalEngagement += m.likes + m.comments + m.shares + m.saves
    }
  }

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      avgViews: row.publishedCount > 0 ? Math.round(row.views / row.publishedCount) : 0,
      avgEngagementRate:
        row.reach > 0 ? (row.totalEngagement / row.reach) * 100 : 0,
    }))
    .sort((a, b) => b.views - a.views)
}

export async function getMonthlyTrend(
  filters: AnalyticsFilters
): Promise<MonthlyTrend[]> {
  const supabase = createClient()

  const contentQuery = buildContentFilter(filters)
  const { data: contents } = await contentQuery.select('id, status, planned_date')
  const all = contents || []

  const byMonth = new Map<string, { planned: number; published: number }>()

  all.forEach((c) => {
    if (!c.planned_date) return
    const monthKey = c.planned_date.slice(0, 7)
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, { planned: 0, published: 0 })
    byMonth.get(monthKey)!.planned += 1
    if (c.status === 'PUBLISHED') byMonth.get(monthKey)!.published += 1
  })

  const { data: publications } = await supabase
    .from('publications')
    .select('id, content_id, actual_publish_date')
    .in('content_id', all.map((c) => c.id))

  const pubMonthMetrics = new Map<string, { views: number; likes: number; reach: number; engagement: number }>()

  const pubIds = (publications || []).map((p) => p.id)

  if (pubIds.length > 0) {
    const { data: metrics } = await supabase
      .from('performance_metrics')
      .select('*')
      .in('publication_id', pubIds)

    const pubById = new Map<string, { content_id: string; actual_publish_date: string | null }>()
    ;(publications || []).forEach((p) => pubById.set(p.id, p))

    for (const m of metrics || []) {
      const pub = pubById.get(m.publication_id)
      if (!pub?.actual_publish_date) continue
      const monthKey = pub.actual_publish_date.slice(0, 7)
      if (!pubMonthMetrics.has(monthKey)) {
        pubMonthMetrics.set(monthKey, { views: 0, likes: 0, reach: 0, engagement: 0 })
      }
      const agg = pubMonthMetrics.get(monthKey)!
      agg.views += m.views
      agg.likes += m.likes
      agg.reach += m.reach
      agg.engagement += m.likes + m.comments + m.shares + m.saves
    }
  }

  const months = new Set<string>([
    ...Array.from(byMonth.keys()),
    ...Array.from(pubMonthMetrics.keys()),
  ])

  return Array.from(months)
    .sort()
    .map((monthKey) => {
      const planned = byMonth.get(monthKey)?.planned || 0
      const published = byMonth.get(monthKey)?.published || 0
      const perf = pubMonthMetrics.get(monthKey)

      const [year, month] = monthKey.split('-')
      const label = `${MONTH_LABELS[parseInt(month) - 1]} ${year.slice(2)}`

      return {
        month: monthKey,
        label,
        planned,
        published,
        realizationRate: planned > 0 ? (published / planned) * 100 : 0,
        views: perf?.views || 0,
        likes: perf?.likes || 0,
        engagementRate: perf && perf.reach > 0 ? (perf.engagement / perf.reach) * 100 : 0,
      }
    })
}

export async function getTopContent(
  filters: AnalyticsFilters,
  metric: 'views' | 'engagementRate' | 'likes' | 'shares' = 'views',
  limit = 10
): Promise<TopContent[]> {
  const supabase = createClient()

  const contentQuery = buildContentFilter(filters)
  const { data: contents } = await contentQuery.select('id, title, platform:platforms(name)')
  const all = contents || []

  const contentById = new Map(all.map((c) => [c.id, c]))

  const { data: publications } = await supabase
    .from('publications')
    .select('id, content_id')
    .in('content_id', all.map((c) => c.id))

  const pubToContent = new Map<string, string>()
  ;(publications || []).forEach((p) => pubToContent.set(p.id, p.content_id))

  const agg = new Map<string, TopContent>()

  const pubIds = Array.from(pubToContent.keys())

  if (pubIds.length > 0) {
    const { data: metrics } = await supabase
      .from('performance_metrics')
      .select('*')
      .in('publication_id', pubIds)

    for (const m of metrics || []) {
      const contentId = pubToContent.get(m.publication_id)
      if (!contentId) continue
      const content = contentById.get(contentId)
      if (!content) continue

      if (!agg.has(contentId)) {
        agg.set(contentId, {
          contentId,
          title: content.title,
          platform: (content.platform as { name?: string } | null)?.name || '-',
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          reach: 0,
          engagementRate: 0,
        })
      }

      const row = agg.get(contentId)!
      row.views += m.views
      row.likes += m.likes
      row.comments += m.comments
      row.shares += m.shares
      row.saves += m.saves
      row.reach += m.reach
    }
  }

  return Array.from(agg.values())
    .map((row) => ({
      ...row,
      engagementRate:
        row.reach > 0
          ? ((row.likes + row.comments + row.shares + row.saves) / row.reach) * 100
          : 0,
    }))
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, limit)
}
