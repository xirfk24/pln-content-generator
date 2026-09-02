import { NextRequest, NextResponse } from 'next/server'
import { getContents, createContent } from '@/services/content'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const filters = {
    search: searchParams.get('search') || undefined,
    pillar_id: searchParams.get('pillar_id') || undefined,
    platform_id: searchParams.get('platform_id') || undefined,
    status: searchParams.get('status') || undefined,
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
  }
  
  const contents = await getContents(filters)
  
  return NextResponse.json({ contents })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const content = await createContent(body)
  
  if (!content) {
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 })
  }
  
  return NextResponse.json({ content })
}
