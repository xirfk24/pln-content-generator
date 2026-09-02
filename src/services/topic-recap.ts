'use server'

import { createClient } from '@/lib/supabase/server'
import type { AnalyticsFilters } from './analytics'

export interface TopicRecapRow {
  code: string
  topic: string
  count: number
}

/** Topic recap per pillar (A-Z codes) — matches template "REKAP JUMLAH TOPIK". */
export async function getTopicRecap(
  filters: AnalyticsFilters
): Promise<TopicRecapRow[]> {
  const supabase = createClient()

  let query = supabase
    .from('contents')
    .select('pillar:pillars(name)')
    .not('pillar_id', 'is', null)

  if (filters.date_from) query = query.gte('planned_date', filters.date_from)
  if (filters.date_to) query = query.lte('planned_date', filters.date_to)
  if (filters.pillar_id) query = query.eq('pillar_id', filters.pillar_id)
  if (filters.platform_id) query = query.eq('platform_id', filters.platform_id)
  if (filters.status) query = query.eq('status', filters.status)

  const { data, error } = await query

  if (error) {
    console.error('Error fetching topic recap:', error)
    return []
  }

  const counts = new Map<string, number>()

  for (const row of data || []) {
    const name = (row.pillar as { name?: string } | null)?.name || ''
    if (!name) continue
    counts.set(name, (counts.get(name) || 0) + 1)
  }

  // Parse "A - Bencana & Pemulihan" -> code "A", topic "Bencana & Pemulihan"
  return Array.from(counts.entries())
    .map(([name, count]) => {
      const m = name.match(/^([A-Z])\s*-\s*(.+)$/)
      return {
        code: m ? m[1] : '?',
        topic: m ? m[2] : name,
        count,
      }
    })
    .sort((a, b) => a.code.localeCompare(b.code))
}
