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

    const result = await ai.reviewContent({
      content: body.content,
      platform: body.platform || 'Instagram',
      targetAudience: body.targetAudience,
    })

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error || 'AI review failed' }, { status: 500 })
    }

    await logAIRequest('CONTENT_REVIEW', body, result.data, result.modelUsed)

    return NextResponse.json({ result: result.data, generatedAt: result.generatedAt })
  } catch {
    return NextResponse.json({ error: 'AI review failed' }, { status: 500 })
  }
}
