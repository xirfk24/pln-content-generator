import { NextRequest, NextResponse } from 'next/server'
import { getPublications, createPublication } from '@/services/publications'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const publications = await getPublications({
    status: searchParams.get('status') || undefined,
    platform_id: searchParams.get('platform_id') || undefined,
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
  })

  return NextResponse.json({ publications })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.content_id) {
    return NextResponse.json({ error: 'content_id is required' }, { status: 400 })
  }

  const publication = await createPublication(body)

  if (!publication) {
    return NextResponse.json({ error: 'Failed to create publication' }, { status: 500 })
  }

  return NextResponse.json({ publication })
}
