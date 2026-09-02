'use server'

import { createClient } from '@/lib/supabase/server'
import type { Publication, Content } from '@/types'
import { PUBLICATION_STATUSES } from '@/constants'

interface PublicationWithContent extends Publication {
  content?: Pick<Content, 'id' | 'title' | 'topic' | 'status' | 'pic'>
}

export async function getPublications(filters?: {
  status?: string
  platform_id?: string
  date_from?: string
  date_to?: string
}): Promise<PublicationWithContent[]> {
  const supabase = createClient()

  let query = supabase
    .from('publications')
    .select(`
      *,
      platform:platforms(*),
      content:contents(id, title, topic, status, pic),
      performance_metrics(*)
    `)
    .order('planned_publish_date', { ascending: true })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.platform_id) {
    query = query.eq('platform_id', filters.platform_id)
  }

  if (filters?.date_from) {
    query = query.gte('planned_publish_date', filters.date_from)
  }

  if (filters?.date_to) {
    query = query.lte('planned_publish_date', filters.date_to)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching publications:', error)
    return []
  }

  return data || []
}

export async function getPublicationsByContent(contentId: string): Promise<Publication[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('publications')
    .select('*, platform:platforms(*), performance_metrics(*)')
    .eq('content_id', contentId)
    .order('planned_publish_date')

  if (error) {
    console.error('Error fetching publications:', error)
    return []
  }

  return data || []
}

export async function createPublication(input: {
  content_id: string
  platform_id?: string
  planned_publish_date?: string
  actual_publish_date?: string
  url?: string
  status?: string
  notes?: string
}): Promise<Publication | null> {
  const supabase = createClient()

  if (input.status && !PUBLICATION_STATUSES.includes(input.status as never)) {
    return null
  }

  const { data, error } = await supabase
    .from('publications')
    .insert(input)
    .select('*, platform:platforms(*)')
    .single()

  if (error) {
    console.error('Error creating publication:', error)
    return null
  }

  return data
}

export async function updatePublication(
  id: string,
  input: Partial<{
    platform_id: string
    planned_publish_date: string
    actual_publish_date: string
    url: string
    status: string
    notes: string
  }>
): Promise<Publication | null> {
  const supabase = createClient()

  if (input.status && !PUBLICATION_STATUSES.includes(input.status as never)) {
    return null
  }

  const { data, error } = await supabase
    .from('publications')
    .update(input)
    .eq('id', id)
    .select('*, platform:platforms(*)')
    .single()

  if (error) {
    console.error('Error updating publication:', error)
    return null
  }

  return data
}

export async function deletePublication(id: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase.from('publications').delete().eq('id', id)

  if (error) {
    console.error('Error deleting publication:', error)
    return false
  }

  return true
}
