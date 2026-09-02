'use server'

import { createClient } from '@/lib/supabase/server'
import type { ApprovalHistory, Publication, Content } from '@/types'

export async function getApprovalHistory(contentId: string): Promise<ApprovalHistory[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('approval_histories')
    .select('*, performer:profiles(*)')
    .eq('content_id', contentId)
    .order('performed_at', { ascending: true })
  
  if (error) {
    console.error('Error fetching approval history:', error)
    return []
  }
  
  return data || []
}

export async function getPublications(contentId: string): Promise<Publication[]> {
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

export async function getContentWithDetails(id: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('contents')
    .select('*, pillar:pillars(*), category:categories(*), platform:platforms(*), publications(*, platform:platforms(*), performance_metrics(*))')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching content details:', error)
    return null
  }
  
  return data as Content & { publications: Publication[] }
}
