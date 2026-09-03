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
import { PageHeader } from '@/components/ui/page-header'
import { FilterBar, EMPTY_FILTERS, type FilterValues } from '@/components/analytics/filter-bar'
import { SkeletonCard, SkeletonKPI } from '@/components/ui/skeleton'
import { ENGAGEMENT_FORMULA } from '@/constants'
import {
  AXIS_PROPS,
  GRID_PROPS,
  CHART_COLORS,
  ChartTooltip,
  formatNumber,
  formatPercent,
} from '@/lib/charts'

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
      <PageHeader
        title="Analytics Overview"
        description="Content and performance analytics"
      />

      <Card>
        <CardContent className="p-4">
          <FilterBar filters={filters} onChange={setFilters} masterData={masterData} />
        </CardContent>
      </Card>

      {loading || !data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <SkeletonKPI />
            <SkeletonKPI />
            <SkeletonKPI />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SkeletonCard className="h-80" />
            <SkeletonCard className="h-80" />
          </div>
          <SkeletonCard className="h-72" />
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
                  <>
                    <div role="img" aria-label="Grouped bar chart of views, likes, and shares by platform">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.platformPerformance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid {...GRID_PROPS} />
                          <XAxis dataKey="platform" {...AXIS_PROPS} tick={{ ...AXIS_PROPS.tick, fontSize: 11 }} />
                          <YAxis {...AXIS_PROPS} tickFormatter={formatNumber} width={56} />
                          <Tooltip
                            cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
                            content={(props) => <ChartTooltip {...props} formatter={formatNumber} />}
                          />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                          <Bar dataKey="views" name="Views" fill={CHART_COLORS.primary} radius={[3, 3, 0, 0]} />
                          <Bar dataKey="likes" name="Likes" fill={CHART_COLORS.danger} radius={[3, 3, 0, 0]} />
                          <Bar dataKey="shares" name="Shares" fill={CHART_COLORS.success} radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="sr-only">
                      {data.platformPerformance.map((p) => (
                        <li key={p.platform}>{`${p.platform}: ${formatNumber(p.views)} views, ${formatNumber(p.likes)} likes, ${formatNumber(p.shares)} shares`}</li>
                      ))}
                    </ul>
                  </>
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
                  <>
                    <div role="img" aria-label="Bar chart of engagement rate by platform">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.platformPerformance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid {...GRID_PROPS} />
                          <XAxis dataKey="platform" {...AXIS_PROPS} tick={{ ...AXIS_PROPS.tick, fontSize: 11 }} />
                          <YAxis {...AXIS_PROPS} unit="%" {...AXIS_PROPS} width={48} />
                          <Tooltip
                            cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
                            content={(props) => <ChartTooltip {...props} formatter={formatPercent} />}
                          />
                          <Bar dataKey="engagementRate" name="Engagement Rate" fill={CHART_COLORS.violet} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="sr-only">
                      {data.platformPerformance.map((p) => (
                        <li key={p.platform}>{`${p.platform}: ${formatPercent(p.engagementRate)} engagement rate`}</li>
                      ))}
                    </ul>
                  </>
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
                    <caption className="sr-only">
                      Content count, published count, views, average views, engagement, and
                      engagement rate per pillar
                    </caption>
                    <thead className="border-b bg-surface-muted">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Pillar</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Content</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Published</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Views</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Avg Views</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Engagement</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Eng. Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.pillarPerformance.map((p) => (
                        <tr key={p.pillar} className="hover:bg-surface-muted">
                          <td className="px-4 py-3">
                            <Badge variant="outline">{p.pillar}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">{p.contentCount}</td>
                          <td className="px-4 py-3 text-right text-sm">{p.publishedCount}</td>
                          <td className="px-4 py-3 text-right text-sm">{p.views.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-sm">{p.avgViews.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-sm">{p.totalEngagement.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-success">
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
                  <div role="img" aria-label="Bar chart comparing planned and published content per month">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.monthlyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="label" {...AXIS_PROPS} />
                        <YAxis {...AXIS_PROPS} allowDecimals={false} width={48} />
                        <Tooltip
                          cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
                          content={(props) => <ChartTooltip {...props} formatter={formatNumber} />}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Bar dataKey="planned" name="Planned" fill={CHART_COLORS.neutral} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="published" name="Published" fill={CHART_COLORS.success} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full">
                      <caption className="sr-only">
                        Planned, published, and realization rate per month
                      </caption>
                      <thead className="border-b bg-surface-muted">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Month</th>
                          <th scope="col" className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Planned</th>
                          <th scope="col" className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Published</th>
                          <th scope="col" className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Realization Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.monthlyTrend.map((m) => (
                          <tr key={m.label}>
                            <td className="px-4 py-2 text-sm">{m.label}</td>
                            <td className="px-4 py-2 text-right text-sm">{m.planned}</td>
                            <td className="px-4 py-2 text-right text-sm">{m.published}</td>
                            <td className="px-4 py-2 text-right text-sm">
                              <span
                                className={
                                  m.realizationRate >= 80
                                    ? 'font-medium text-success'
                                    : m.realizationRate >= 50
                                      ? 'font-medium text-warning'
                                      : 'font-medium text-danger'
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
