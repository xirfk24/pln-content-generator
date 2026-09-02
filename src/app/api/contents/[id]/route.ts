import { NextRequest, NextResponse } from 'next/server'
import { getContentById, updateContent, deleteContent } from '@/services/content'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const content = await getContentById(id)
  
  if (!content) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 })
  }
  
  return NextResponse.json({ content })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  
  const content = await updateContent(id, body)
  
  if (!content) {
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 })
  }
  
  return NextResponse.json({ content })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const success = await deleteContent(id)
  
  if (!success) {
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}
