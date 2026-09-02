import { NextRequest, NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/ai'

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const ai = getAIProvider()
  
  const result = await ai.generateContent({
    topic: body.topic,
    pillar: body.pillar,
    platform: body.platform,
    format: body.format,
    targetAudience: body.targetAudience,
    tone: body.tone,
  })
  
  return NextResponse.json({ result: result.data })
}
