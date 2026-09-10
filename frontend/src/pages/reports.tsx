'use client'

import { apiFetch } from '@/lib/api'
import { CONTENT_PURPOSE_LABELS, POSTING_CATEGORY_LABELS } from '@/constants'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Loader2, Download, FileBarChart } from 'lucide-react'
import { FilterBar, EMPTY_FILTERS, type FilterValues } from '@/components/analytics/filter-bar'
import { formatDate } from '@/lib/utils'

interface ReportRow {
  id: string
  title: string
  topic: string
  pillar: string
  platform: string
  category: string
  format: string
  content_purpose: string | null
  posting_category: string | null
  status: string
  planned_date: string
  pic: string
  priority: string
}

export default function ReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS)
  const [masterData, setMasterData] = useState<{
    pillars: Array<{ id: string; name: string }>
    platforms: Array<{ id: string; name: string }>
  }>({ pillars: [], platforms: [] })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
      const res = await apiFetch(`/api/reports?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.rows || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    apiFetch('/api/master-data')
      .then((r) => r.json())
      .then((d) => setMasterData({ pillars: d.pillars || [], platforms: d.platforms || [] }))
      .catch(console.error)
  }, [])

  async function handleExportCsv() {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
      params.set('format', 'csv')

      const res = await apiFetch(`/api/reports?${params.toString()}`)
      if (!res.ok) {
        console.error('CSV export failed:', res.status)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV export error:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Reports</h1>
          <p className="mt-1 text-sm text-ink-secondary">Generate and export content reports</p>
        </div>
        <Button onClick={handleExportCsv} disabled={loading || rows.length === 0} className="self-start sm:self-auto">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <FilterBar filters={filters} onChange={setFilters} masterData={masterData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-ink-muted" />
            <CardTitle className="text-base">
              Content Report
              <span className="ml-2 text-sm font-normal text-ink-secondary">
                {loading ? 'Loading...' : `${rows.length} records`}
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-muted">
              No data matches the selected filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-surface-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Tema</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Platform</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Format</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Purpose</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Posting</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Planned Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">PIC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-muted">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{row.title}</div>
                        <div className="text-xs text-ink-secondary">{row.topic}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.pillar ? <Badge variant="outline">{row.pillar}</Badge> : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-secondary">{row.platform || '-'}</td>
                      <td className="px-4 py-3 text-sm text-ink-secondary">{row.format}</td>
                      <td className="px-4 py-3 text-sm text-ink-secondary">
                        {row.content_purpose ? (CONTENT_PURPOSE_LABELS[row.content_purpose] ?? row.content_purpose) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-secondary">
                        {row.posting_category ? (POSTING_CATEGORY_LABELS[row.posting_category] ?? row.posting_category) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                        {formatDate(row.planned_date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-secondary">{row.pic || '-'}</td>
                      <td className="px-4 py-3 text-sm text-ink-secondary">{row.priority || '-'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status as never} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
