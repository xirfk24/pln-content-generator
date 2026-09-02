'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { FilterBar, EMPTY_FILTERS, type FilterValues } from '@/components/analytics/filter-bar'
import { ENGAGEMENT_FORMULA } from '@/constants'

interface AnalyticsData {
  platformPerformance: Array<{
    platform: string
    contentCount: number
    views: number
    likes: number
    comments: number
    shares: number
    engagementRate: number
  }>
  pillarPerformance: Array<{
    pillar: string
    contentCount: number
    publishedCount: number
    views: number
    avgViews: number
    totalEngagement: number
    avgEngagementRate: number
  }>
  monthlyTrend: Array<{
    label: string
    planned: number
    published: number
    realizationRate: number
    engagementRate: number
  }>
}

interface TopicRecapRow {
  code: string
  topic: string
  count: number
}

export default function AnalyticsOverviewPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [recap, setRecap] = useState<{ recap: TopicRecapRow[]; total: number } | null>(null)
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
      const [analyticsRes, recapRes] = await Promise.all([
        fetch(`/api/analytics?${params.toString()}`),
        fetch(`/api/analytics/topic-recap?${params.toString()}`),
      ])
      if (analyticsRes.ok) setData(await analyticsRes.json())
      if (recapRes.ok) setRecap(await recapRes.json())
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
    fetch('/api/master-data')
      .then((r) => r.json())
      .then((d) => setMasterData({ pillars: d.pillars || [], platforms: d.platforms || [] }))
      .catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Analytics Overview</h1>
        <p className="mt-1 text-sm text-ink-secondary">Content and performance analytics</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <FilterBar filters={filters} onChange={setFilters} masterData={masterData} />
        </CardContent>
      </Card>

      {loading || !data ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance by Platform</CardTitle>
              </CardHeader>
              <CardContent>
                {data.platformPerformance.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-muted">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.platformPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="platform" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="views" fill="#3b82f6" name="Views" />
                      <Bar dataKey="likes" fill="#ef4444" name="Likes" />
                      <Bar dataKey="shares" fill="#10b981" name="Shares" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Engagement Rate by Platform</CardTitle>
              </CardHeader>
              <CardContent>
                {data.platformPerformance.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-muted">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.platformPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="platform" fontSize={12} />
                      <YAxis fontSize={12} unit="%" />
                      <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
                      <Bar dataKey="engagementRate" fill="#8b5cf6" name="Engagement Rate" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance by Pillar</CardTitle>
            </CardHeader>
            <CardContent>
              {data.pillarPerformance.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">No data</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-surface-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Pillar</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Content</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Published</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Views</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Avg Views</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Engagement</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Eng. Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.pillarPerformance.map((p) => (
                        <tr key={p.pillar} className="hover:bg-surface-muted">
                          <td className="px-4 py-3">
                            <Badge variant="outline">{p.pillar}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">{p.contentCount}</td>
                          <td className="px-4 py-3 text-sm">{p.publishedCount}</td>
                          <td className="px-4 py-3 text-sm">{p.views.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">{p.avgViews.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">{p.totalEngagement.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm font-medium text-success">
                            {p.avgEngagementRate.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs text-ink-muted">{ENGAGEMENT_FORMULA}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly: Planned vs Published</CardTitle>
            </CardHeader>
            <CardContent>
              {data.monthlyTrend.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">No data</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="planned" fill="#94a3b8" name="Planned" />
                      <Bar dataKey="published" fill="#10b981" name="Published" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-surface-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Month</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Planned</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Published</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Realization Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.monthlyTrend.map((m) => (
                          <tr key={m.label}>
                            <td className="px-4 py-2 text-sm">{m.label}</td>
                            <td className="px-4 py-2 text-sm">{m.planned}</td>
                            <td className="px-4 py-2 text-sm">{m.published}</td>
                            <td className="px-4 py-2 text-sm">
                              <span
                                className={
                                  m.realizationRate >= 80
                                    ? 'text-success'
                                    : m.realizationRate >= 50
                                      ? 'text-warning'
                                      : 'text-danger'
                                }
                              >
                                {m.realizationRate.toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {recap && recap.recap.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Rekap Jumlah Topik (Kode A-Z)</CardTitle>
                <p className="text-sm text-ink-secondary">
                  Jumlah konten per kode topik — sesuai template Content Plan.
                  Total: <span className="font-semibold text-ink">{recap.total}</span>
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {recap.recap.map((row) => (
                    <div
                      key={row.code}
                      className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-primary-soft text-xs font-bold text-primary">
                          {row.code}
                        </span>
                        <span className="truncate text-xs text-ink-secondary" title={row.topic}>
                          {row.topic}
                        </span>
                      </div>
                      <span className="ml-2 flex-shrink-0 text-sm font-semibold text-ink">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-center text-sm text-ink-muted">
            Want detailed metrics per content?{' '}
            <Link href="/analytics/performance" className="text-primary hover:underline">
              Open Performance Analytics
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
