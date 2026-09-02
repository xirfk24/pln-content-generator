import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMyTasks } from '@/services/approval'

export async function GET() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tasks = await getMyTasks(user.id)

  return NextResponse.json(tasks)
}
