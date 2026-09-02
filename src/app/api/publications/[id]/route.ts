import { NextRequest, NextResponse } from 'next/server'
import { updatePublication, deletePublication } from '@/services/publications'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  if (body.url && body.url !== '' && !isValidUrl(body.url)) {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
  }

  const publication = await updatePublication(id, body)

  if (!publication) {
    return NextResponse.json({ error: 'Failed to update publication' }, { status: 500 })
  }

  return NextResponse.json({ publication })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const success = await deletePublication(id)

  if (!success) {
    return NextResponse.json({ error: 'Failed to delete publication' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
