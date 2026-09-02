import { NextRequest, NextResponse } from 'next/server'
import { convertIdeaToContent } from '@/services/content-ideas'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  const contentId = await convertIdeaToContent(id)
  
  if (!contentId) {
    return NextResponse.json({ error: 'Failed to convert idea' }, { status: 500 })
  }
  
  return NextResponse.json({ contentId })
}
