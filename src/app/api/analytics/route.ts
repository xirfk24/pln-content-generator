import { NextRequest, NextResponse } from 'next/server'
import {
  getPlatformPerformance,
  getPillarPerformance,
  getMonthlyTrend,
  getTopContent,
  getDashboardKPIs,
} from '@/services/analytics'
import type { AnalyticsFilters } from '@/services/analytics'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams

  const filters: AnalyticsFilters = {
    date_from: sp.get('date_from') || undefined,
    date_to: sp.get('date_to') || undefined,
    platform_id: sp.get('platform_id') || undefined,
    pillar_id: sp.get('pillar_id') || undefined,
    status: sp.get('status') || undefined,
  }

  const metricParam = sp.get('metric')
  const rankMetric =
    metricParam === 'engagementRate' || metricParam === 'likes' || metricParam === 'shares'
      ? metricParam
      : 'views'

  const [kpis, platformPerf, pillarPerf, monthly, top] = await Promise.all([
    getDashboardKPIs(filters),
    getPlatformPerformance(filters),
    getPillarPerformance(filters),
    getMonthlyTrend(filters),
    getTopContent(filters, rankMetric, 10),
  ])

  return NextResponse.json({
    kpis,
    platformPerformance: platformPerf,
    pillarPerformance: pillarPerf,
    monthlyTrend: monthly,
    topContent: top,
    rankMetric,
  })
}
