import { NextRequest, NextResponse } from 'next/server'
import { getTopicRecap } from '@/services/topic-recap'
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

  const recap = await getTopicRecap(filters)
  const total = recap.reduce((sum, r) => sum + r.count, 0)

  return NextResponse.json({ recap, total })
}
