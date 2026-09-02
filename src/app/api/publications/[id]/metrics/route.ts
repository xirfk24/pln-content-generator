import { NextRequest, NextResponse } from 'next/server'
import { getMetricsByPublication, saveMetrics } from '@/services/metrics'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const metrics = await getMetricsByPublication(id)
  return NextResponse.json({ metrics })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const result = await saveMetrics({
    publication_id: id,
    views: Number(body.views),
    likes: Number(body.likes),
    comments: Number(body.comments),
    shares: Number(body.shares),
    saves: Number(body.saves),
    reach: Number(body.reach),
    recorded_at: body.recorded_at,
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ metric: result })
}
