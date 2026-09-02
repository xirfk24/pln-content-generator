import { NextRequest, NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/ai'
import { logAIRequest } from '@/services/ai-logging'

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  try {
    const ai = getAIProvider()

    const result = await ai.improveContent({
      originalContent: body.content,
      improvementType: body.improvementType || 'all',
      targetAudience: body.targetAudience,
      platform: body.platform,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'AI improvement failed' },
        { status: 500 }
      )
    }

    await logAIRequest('CONTENT_IMPROVEMENT', body, result.data, result.modelUsed)

    return NextResponse.json({ result: result.data, generatedAt: result.generatedAt })
  } catch {
    return NextResponse.json({ error: 'AI improvement failed' }, { status: 500 })
  }
}
