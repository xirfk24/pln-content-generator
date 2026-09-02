import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getApprovalQueue } from '@/services/approval'
import type { UserRole } from '@/types'

export async function GET() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const queue = await getApprovalQueue(profile.role as UserRole)

  return NextResponse.json({ queue, role: profile.role })
}
