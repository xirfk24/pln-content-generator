'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

type MasterTable = 'pillars' | 'categories' | 'platforms'

async function requireAdmin(): Promise<string | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'ADMIN' ? user.id : null
}

export async function listMaster(table: MasterTable) {
  const supabase = createClient()

  const { data, error } = await supabase.from(table).select('*').order('name')

  if (error) {
    console.error(`Error listing ${table}:`, error)
    return []
  }

  return data || []
}

export async function createMaster(
  table: MasterTable,
  input: { name: string; description?: string; icon?: string }
) {
  const adminId = await requireAdmin()
  if (!adminId) return { error: 'Admin role required' }

  if (!input.name?.trim()) return { error: 'Name is required' }

  const supabase = createClient()

  const payload: Record<string, string> = { name: input.name.trim() }
  if (input.description) payload.description = input.description
  if (input.icon) payload.icon = input.icon

  const { data, error } = await supabase.from(table).insert(payload).select('*').single()

  if (error || !data) {
    return { error: `Failed to create ${table}` }
  }

  return { data }
}

export async function updateMaster(
  table: MasterTable,
  id: string,
  input: { name?: string; description?: string; icon?: string }
) {
  const adminId = await requireAdmin()
  if (!adminId) return { error: 'Admin role required' }

  const supabase = createClient()

  const payload: Record<string, string> = {}
  if (input.name !== undefined) payload.name = input.name
  if (input.description !== undefined) payload.description = input.description
  if (input.icon !== undefined) payload.icon = input.icon

  if (Object.keys(payload).length === 0) return { error: 'Nothing to update' }

  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !data) {
    return { error: `Failed to update ${table}` }
  }

  return { data }
}

export async function deleteMaster(table: MasterTable, id: string) {
  const adminId = await requireAdmin()
  if (!adminId) return { error: 'Admin role required' }

  const supabase = createClient()

  const { error } = await supabase.from(table).delete().eq('id', id)

  if (error) {
    return { error: `Failed to delete — item may be in use` }
  }

  return { success: true }
}

export async function listUsers() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error listing users:', error)
    return []
  }

  return data || []
}

export async function updateUserRole(
  userId: string,
  input: { role?: UserRole; is_active?: boolean; full_name?: string }
) {
  const adminId = await requireAdmin()
  if (!adminId) return { error: 'Admin role required' }

  const supabase = createClient()

  const payload: Record<string, string | boolean> = {}
  if (input.role) payload.role = input.role
  if (input.is_active !== undefined) payload.is_active = input.is_active
  if (input.full_name) payload.full_name = input.full_name

  if (Object.keys(payload).length === 0) return { error: 'Nothing to update' }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .single()

  if (error || !data) {
    return { error: 'Failed to update user' }
  }

  return { data }
}
