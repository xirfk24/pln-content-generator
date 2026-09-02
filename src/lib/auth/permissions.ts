import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserRole } from '@/types'

export async function getCurrentUser() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    ...user,
    profile,
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return user
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireAuth()
  
  if (!user.profile || !roles.includes(user.profile.role as UserRole)) {
    redirect('/unauthorized')
  }
  
  return user
}

export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole)
}

export const PERMISSIONS = {
  MANAGE_USERS: ['ADMIN'] as UserRole[],
  MANAGE_MASTER_DATA: ['ADMIN'] as UserRole[],
  VIEW_ALL_CONTENT: ['ADMIN', 'REVIEWER', 'APPROVER'] as UserRole[],
  CREATE_CONTENT: ['ADMIN', 'STAFF'] as UserRole[],
  EDIT_CONTENT: ['ADMIN', 'STAFF'] as UserRole[],
  DELETE_CONTENT: ['ADMIN'] as UserRole[],
  REVIEW_CONTENT: ['ADMIN', 'REVIEWER'] as UserRole[],
  APPROVE_CONTENT: ['ADMIN', 'APPROVER'] as UserRole[],
  VIEW_ANALYTICS: ['ADMIN', 'STAFF', 'REVIEWER', 'APPROVER'] as UserRole[],
  USE_AI: ['ADMIN', 'STAFF'] as UserRole[],
} as const
