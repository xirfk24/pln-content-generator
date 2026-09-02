'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentIdea, Pillar } from '@/types'

export async function getPillars(): Promise<Pillar[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('pillars')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Error fetching pillars:', error)
    return []
  }
  
  return data || []
}

export async function getContentIdeas(filters?: {
  search?: string
  pillar_id?: string
  status?: string
}): Promise<ContentIdea[]> {
  const supabase = createClient()
  
  let query = supabase
    .from('content_ideas')
    .select('*, pillar:pillars(*)')
    .order('created_at', { ascending: false })
  
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }
  
  if (filters?.pillar_id) {
    query = query.eq('pillar_id', filters.pillar_id)
  }
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching content ideas:', error)
    return []
  }
  
  return data || []
}

export async function getContentIdeaById(id: string): Promise<ContentIdea | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('content_ideas')
    .select('*, pillar:pillars(*)')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching content idea:', error)
    return null
  }
  
  return data
}

export async function createContentIdea(input: {
  title: string
  description?: string
  pillar_id?: string
  target_audience?: string
  source?: string
  notes?: string
}): Promise<ContentIdea | null> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data, error } = await supabase
    .from('content_ideas')
    .insert({
      ...input,
      created_by: user.id,
      status: 'DRAFT',
    })
    .select('*, pillar:pillars(*)')
    .single()
  
  if (error) {
    console.error('Error creating content idea:', error)
    return null
  }
  
  return data
}

export async function updateContentIdea(id: string, input: Partial<{
  title: string
  description: string
  pillar_id: string
  target_audience: string
  source: string
  notes: string
  status: string
}>): Promise<ContentIdea | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('content_ideas')
    .update(input)
    .eq('id', id)
    .select('*, pillar:pillars(*)')
    .single()
  
  if (error) {
    console.error('Error updating content idea:', error)
    return null
  }
  
  return data
}

export async function deleteContentIdea(id: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('content_ideas')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting content idea:', error)
    return false
  }
  
  return true
}

export async function convertIdeaToContent(ideaId: string): Promise<string | null> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: idea } = await supabase
    .from('content_ideas')
    .select('*')
    .eq('id', ideaId)
    .single()
  
  if (!idea) return null
  
  const { data: content, error: contentError } = await supabase
    .from('contents')
    .insert({
      title: idea.title,
      topic: idea.title,
      pillar_id: idea.pillar_id,
      brief: idea.description,
      target_audience: idea.target_audience,
      source_idea_id: ideaId,
      created_by: user.id,
      status: 'DRAFT',
      format: 'Carousel',
    })
    .select('id')
    .single()
  
  if (contentError) {
    console.error('Error converting idea:', contentError)
    return null
  }
  
  await supabase
    .from('content_ideas')
    .update({ status: 'CONVERTED' })
    .eq('id', ideaId)
  
  return content?.id || null
}
