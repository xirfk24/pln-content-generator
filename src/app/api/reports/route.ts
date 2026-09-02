import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams

  const dateFrom = sp.get('date_from')
  const dateTo = sp.get('date_to')
  const platformId = sp.get('platform_id')
  const pillarId = sp.get('pillar_id')
  const status = sp.get('status')

  const supabase = createClient()

  let query = supabase
    .from('contents')
    .select(
      'id, title, topic, status, planned_date, pic, priority, format, pillar:pillars(name), platform:platforms(name), category:categories(name)'
    )
    .order('planned_date', { ascending: false })

  if (dateFrom) query = query.gte('planned_date', dateFrom)
  if (dateTo) query = query.lte('planned_date', dateTo)
  if (platformId) query = query.eq('platform_id', platformId)
  if (pillarId) query = query.eq('pillar_id', pillarId)
  if (status) query = query.eq('status', status)

  const { data: contents, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }

  const rows = (contents || []).map((c) => ({
    id: c.id,
    title: c.title,
    topic: c.topic,
    pillar: (c.pillar as { name?: string } | null)?.name || '',
    platform: (c.platform as { name?: string } | null)?.name || '',
    category: (c.category as { name?: string } | null)?.name || '',
    format: c.format,
    status: c.status,
    planned_date: c.planned_date || '',
    pic: c.pic || '',
    priority: c.priority || '',
  }))

  const format = sp.get('format')

  if (format === 'csv') {
    const headers = [
      'ID',
      'Title',
      'Topic',
      'Pillar',
      'Platform',
      'Category',
      'Format',
      'Status',
      'Planned Date',
      'PIC',
      'Priority',
    ]

    const escape = (val: string | number) => {
      const s = String(val)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const csvLines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.id,
          r.title,
          r.topic,
          r.pillar,
          r.platform,
          r.category,
          r.format,
          r.status,
          r.planned_date,
          r.pic,
          r.priority,
        ]
          .map(escape)
          .join(',')
      ),
    ]

    const csv = '\uFEFF' + csvLines.join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="content-report-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    })
  }

  return NextResponse.json({ rows, total: rows.length })
}
