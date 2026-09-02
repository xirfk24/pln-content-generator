'use server'

import { createClient } from '@/lib/supabase/server'
import type { PerformanceMetric } from '@/types'

export async function getMetricsByPublication(publicationId: string): Promise<PerformanceMetric[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('performance_metrics')
    .select('*')
    .eq('publication_id', publicationId)
    .order('recorded_at', { ascending: false })

  if (error) {
    console.error('Error fetching metrics:', error)
    return []
  }

  return data || []
}

export async function saveMetrics(input: {
  publication_id: string
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  recorded_at?: string
}): Promise<PerformanceMetric | { error: string }> {
  const supabase = createClient()

  const numericFields = ['views', 'likes', 'comments', 'shares', 'saves', 'reach'] as const
  for (const field of numericFields) {
    const value = input[field]
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return { error: `${field} must be a number >= 0` }
    }
  }

  const payload = {
    ...input,
    recorded_at: input.recorded_at || new Date().toISOString().split('T')[0],
  }

  const { data: existing } = await supabase
    .from('performance_metrics')
    .select('id')
    .eq('publication_id', input.publication_id)
    .eq('recorded_at', payload.recorded_at)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('performance_metrics')
      .update({
        views: input.views,
        likes: input.likes,
        comments: input.comments,
        shares: input.shares,
        saves: input.saves,
        reach: input.reach,
      })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error || !data) {
      return { error: 'Failed to update metrics' }
    }
    return data
  }

  const { data, error } = await supabase
    .from('performance_metrics')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    return { error: 'Failed to save metrics' }
  }

  return data
}

export async function deleteMetrics(id: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase.from('performance_metrics').delete().eq('id', id)

  if (error) {
    console.error('Error deleting metrics:', error)
    return false
  }

  return true
}
