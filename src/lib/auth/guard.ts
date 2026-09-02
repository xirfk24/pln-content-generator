import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/types'

/**
 * Server-side role guard for layouts/pages.
 * Redirects to /login when unauthenticated, /unauthorized when role insufficient.
 */
export async function requireRolePage(roles: UserRole[]) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const role = (profile?.role as UserRole) || 'STAFF'

  if (!roles.includes(role)) {
    redirect('/unauthorized')
  }

  return { user, profile: { ...profile, role } }
}
