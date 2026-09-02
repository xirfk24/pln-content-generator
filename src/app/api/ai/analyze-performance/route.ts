import { NextRequest, NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/ai'
import { logAIRequest } from '@/services/ai-logging'
import {
  getDashboardKPIs,
  getTopContent,
  getPlatformPerformance,
  getPillarPerformance,
} from '@/services/analytics'
import type { AnalyticsFilters } from '@/services/analytics'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))

  const filters: AnalyticsFilters = {
    date_from: body.date_from || undefined,
    date_to: body.date_to || undefined,
    platform_id: body.platform_id || undefined,
    pillar_id: body.pillar_id || undefined,
    status: body.status || undefined,
  }

  try {
    const [kpis, top, platformPerf, pillarPerf] = await Promise.all([
      getDashboardKPIs(filters),
      getTopContent(filters, 'views', 5),
      getPlatformPerformance(filters),
      getPillarPerformance(filters),
    ])

    const byPlatform: Record<string, { views: number; engagement: number }> = {}
    platformPerf.forEach((p) => {
      byPlatform[p.platform] = { views: p.views, engagement: p.engagementRate }
    })

    const byPillar: Record<string, { count: number; avgEngagement: number }> = {}
    pillarPerf.forEach((p) => {
      byPillar[p.pillar] = { count: p.contentCount, avgEngagement: p.avgEngagementRate }
    })

    const ai = getAIProvider()

    const result = await ai.analyzePerformance({
      data: {
        dateRange: {
          start: filters.date_from || 'all time',
          end: filters.date_to || 'now',
        },
        totalViews: kpis.performance.totalViews,
        totalLikes: kpis.performance.totalLikes,
        totalComments: kpis.performance.totalComments,
        totalShares: kpis.performance.totalShares,
        avgEngagementRate: kpis.performance.avgEngagementRate / 100,
        topContent: top.map((t) => ({
          title: t.title,
          views: t.views,
          engagementRate: t.engagementRate,
        })),
        byPlatform,
        byPillar,
      },
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'AI analysis failed' },
        { status: 500 }
      )
    }

    await logAIRequest('PERFORMANCE_ANALYSIS', { filters }, result.data, result.modelUsed)

    return NextResponse.json({ result: result.data, generatedAt: result.generatedAt })
  } catch {
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
  }
}
