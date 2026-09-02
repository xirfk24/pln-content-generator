import { NextRequest, NextResponse } from 'next/server'
import { getContentIdeas, createContentIdea } from '@/services/content-ideas'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const filters = {
    search: searchParams.get('search') || undefined,
    pillar_id: searchParams.get('pillar_id') || undefined,
    status: searchParams.get('status') || undefined,
  }
  
  const ideas = await getContentIdeas(filters)
  
  return NextResponse.json({ ideas })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const idea = await createContentIdea(body)
  
  if (!idea) {
    return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 })
  }
  
  return NextResponse.json({ idea })
}
