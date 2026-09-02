import { NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/ai'
import { logAIRequest } from '@/services/ai-logging'
import { getTopContent, getPillarPerformance } from '@/services/analytics'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = createClient()

    const [top, pillarPerf, { data: formats }] = await Promise.all([
      getTopContent({}, 'engagementRate', 5),
      getPillarPerformance({}),
      supabase
        .from('contents')
        .select('format, platform:platforms(name), pillar:pillars(name)')
        .eq('status', 'PUBLISHED')
        .limit(50),
    ])

    const historicalData = {
      topPerformingContent: top.map((t) => ({
        title: t.title,
        pillar: '',
        platform: t.platform,
        format: '',
        engagementRate: t.engagementRate,
      })),
      underperformingAreas: pillarPerf
        .filter((p) => p.avgEngagementRate < 3)
        .map((p) => p.pillar),
      recentTrends: (formats || []).slice(0, 10).map(
        (f: { format: string; platform: unknown; pillar: unknown }) =>
          `${(f.pillar as { name?: string }[] | null)?.[0]?.name || '-'} / ${(f.platform as { name?: string }[] | null)?.[0]?.name || '-'} / ${f.format}`
      ),
    }

    const ai = getAIProvider()

    const result = await ai.generateRecommendations({ historicalData })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'AI recommendation failed' },
        { status: 500 }
      )
    }

    await logAIRequest('RECOMMENDATION', historicalData, result.data, result.modelUsed)

    return NextResponse.json({ result: result.data, generatedAt: result.generatedAt })
  } catch {
    return NextResponse.json({ error: 'AI recommendation failed' }, { status: 500 })
  }
}
