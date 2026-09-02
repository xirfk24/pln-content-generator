'use server'

import { createClient } from '@/lib/supabase/server'
import type { Content } from '@/types'

export async function getMasterData() {
  const supabase = createClient()
  
  const [pillarsRes, categoriesRes, platformsRes] = await Promise.all([
    supabase.from('pillars').select('*').order('name'),
    supabase.from('categories').select('*').order('name'),
    supabase.from('platforms').select('*').order('name'),
  ])
  
  return {
    pillars: pillarsRes.data || [],
    categories: categoriesRes.data || [],
    platforms: platformsRes.data || [],
  }
}

export async function getContents(filters?: {
  search?: string
  pillar_id?: string
  platform_id?: string
  status?: string
  date_from?: string
  date_to?: string
}): Promise<Content[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('contents')
    .select('*, pillar:pillars(*), category:categories(*), platform:platforms(*), publications:publications(*)')
    .order('created_at', { ascending: false })
  
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,topic.ilike.%${filters.search}%`)
  }
  
  if (filters?.pillar_id) {
    query = query.eq('pillar_id', filters.pillar_id)
  }
  
  if (filters?.platform_id) {
    query = query.eq('platform_id', filters.platform_id)
  }
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  
  if (filters?.date_from) {
    query = query.gte('planned_date', filters.date_from)
  }
  
  if (filters?.date_to) {
    query = query.lte('planned_date', filters.date_to)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching contents:', error)
    return []
  }
  
  return data || []
}

export async function getContentById(id: string): Promise<Content | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('contents')
    .select('*, pillar:pillars(*), category:categories(*), platform:platforms(*)')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching content:', error)
    return null
  }
  
  return data
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

function getDayName(dateStr?: string): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return DAY_NAMES[d.getDay()]
}

export async function createContent(input: {
  title: string
  topic: string
  pillar_id?: string
  category_id?: string
  platform_id?: string
  format: string
  brief?: string
  target_audience?: string
  planned_date?: string
  planned_week?: number
  reference?: string
  pic?: string
  priority?: string
  source_idea_id?: string
}): Promise<Content | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const plannedWeek = input.planned_date
    ? getWeekNumber(new Date(input.planned_date))
    : null

  const { data, error } = await supabase
    .from('contents')
    .insert({
      ...input,
      planned_week: plannedWeek,
      day: getDayName(input.planned_date),
      created_by: user.id,
      status: 'DRAFT',
    })
    .select('*, pillar:pillars(*), category:categories(*), platform:platforms(*)')
    .single()

  if (error) {
    console.error('Error creating content:', error)
    return null
  }

  return data
}

export async function updateContent(id: string, input: Partial<{
  title: string
  topic: string
  pillar_id: string
  category_id: string
  platform_id: string
  format: string
  brief: string
  target_audience: string
  planned_date: string
  planned_week: number
  reference: string
  pic: string
  priority: string
  status: string
}>): Promise<Content | null> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let plannedWeek = input.planned_week
  const day = getDayName(input.planned_date)
  if (input.planned_date) {
    plannedWeek = getWeekNumber(new Date(input.planned_date))
  }

  const updatePayload: Record<string, unknown> = {
    ...input,
    planned_week: plannedWeek,
    updated_by: user.id,
  }
  if (day !== null) {
    updatePayload.day = day
  }

  const { data, error } = await supabase
    .from('contents')
    .update(updatePayload)
    .eq('id', id)
    .select('*, pillar:pillars(*), category:categories(*), platform:platforms(*)')
    .single()

  if (error) {
    console.error('Error updating content:', error)
    return null
  }

  return data
}

export async function deleteContent(id: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('contents')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting content:', error)
    return false
  }
  
  return true
}

export async function getContentsForCalendar(filters?: {
  date_from?: string
  date_to?: string
}): Promise<Content[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('contents')
    .select('*, pillar:pillars(*), platform:platforms(*)')
    .not('planned_date', 'is', null)
    .order('planned_date')
  
  if (filters?.date_from) {
    query = query.gte('planned_date', filters.date_from)
  }
  
  if (filters?.date_to) {
    query = query.lte('planned_date', filters.date_to)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching calendar contents:', error)
    return []
  }
  
  return data || []
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}
