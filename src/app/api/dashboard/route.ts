import { NextRequest, NextResponse } from 'next/server'
import {
  getDashboardKPIs,
  getContentStatusBreakdown,
  getPlatformPerformance,
  getMonthlyTrend,
  getTopContent,
} from '@/services/analytics'
import type { AnalyticsFilters } from '@/services/analytics'

function parseFilters(request: NextRequest): AnalyticsFilters {
  const sp = request.nextUrl.searchParams
  return {
    date_from: sp.get('date_from') || undefined,
    date_to: sp.get('date_to') || undefined,
    platform_id: sp.get('platform_id') || undefined,
    pillar_id: sp.get('pillar_id') || undefined,
    status: sp.get('status') || undefined,
  }
}

export async function GET(request: NextRequest) {
  const filters = parseFilters(request)

  const [kpis, statusBreakdown, platformPerf, monthly, top] = await Promise.all([
    getDashboardKPIs(filters),
    getContentStatusBreakdown(filters),
    getPlatformPerformance(filters),
    getMonthlyTrend(filters),
    getTopContent(filters, 'views', 5),
  ])

  return NextResponse.json({
    kpis,
    statusBreakdown,
    platformPerformance: platformPerf,
    monthlyTrend: monthly,
    topContent: top,
  })
}
