import { NextRequest, NextResponse } from 'next/server'
import { listUsers, updateUserRole } from '@/services/admin'

export async function GET() {
  const users = await listUsers()
  return NextResponse.json({ users })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()

  if (!body.userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const result = await updateUserRole(body.userId, {
    role: body.role,
    is_active: body.is_active,
    full_name: body.full_name,
  })

  if ('error' in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ user: result.data })
}
