import { NextRequest, NextResponse } from 'next/server'
import { getContentIdeaById, updateContentIdea, deleteContentIdea } from '@/services/content-ideas'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const idea = await getContentIdeaById(id)
  
  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
  }
  
  return NextResponse.json({ idea })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  
  const idea = await updateContentIdea(id, body)
  
  if (!idea) {
    return NextResponse.json({ error: 'Failed to update idea' }, { status: 500 })
  }
  
  return NextResponse.json({ idea })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const success = await deleteContentIdea(id)
  
  if (!success) {
    return NextResponse.json({ error: 'Failed to delete idea' }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}
