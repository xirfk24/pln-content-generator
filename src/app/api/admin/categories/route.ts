import { NextRequest, NextResponse } from 'next/server'
import { listMaster, createMaster } from '@/services/admin'

export async function GET() {
  const items = await listMaster('categories')
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const result = await createMaster('categories', body)
  if ('error' in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ item: result.data })
}
