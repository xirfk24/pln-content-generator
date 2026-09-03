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
  LineChart,
  Line,
  LabelList,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import {
  FileText,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  ClipboardCheck,
} from 'lucide-react'
import { FilterBar, EMPTY_FILTERS, type FilterValues } from '@/components/analytics/filter-bar'
import { SkeletonCard, SkeletonKPI } from '@/components/ui/skeleton'
import { ENGAGEMENT_FORMULA } from '@/constants'
import {
  AXIS_PROPS,
  GRID_PROPS,
  ChartTooltip,
  formatNumber,
} from '@/lib/charts'

interface DashboardData {
  kpis: {
    content: {
      total: number
      planned: number
      inProgress: number
      pendingReview: number
      approved: number
      readyToPublish: number
      published: number
      rescheduled: number
      notRealized: number
    }
    performance: {
      totalViews: number
      totalLikes: number
      totalComments: number
      totalShares: number
      totalReach: number
      avgEngagementRate: number
    }
  }
  statusBreakdown: Array<{ status: string; label: string; count: number }>
  platformPerformance: Array<{ platform: string; contentCount: number; views: number; engagementRate: number }>
  monthlyTrend: Array<{ label: string; planned: number; published: number; views: number }>
  topContent: Array<{
    contentId: string
    title: string
    platform: string
    views: number
    engagementRate: number
  }>
}

function KpiCard({
  title,
  icon: Icon,
  iconClass,
  value,
  hint,
  hintTitle,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  iconClass?: string
  value: string
  hint?: string
  hintTitle?: string
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconClass || 'text-ink-muted'}`} aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {hint && (
          <p className="mt-0.5 text-xs text-ink-muted" title={hintTitle}>
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS)
  const [masterData, setMasterData] = useState<{
    pillars: Array<{ id: string; name: string }>
    platforms: Array<{ id: string; name: string }>
  }>({ pillars: [], platforms: [] })

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
      const res = await fetch(`/api/dashboard?${params.toString()}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    fetch('/api/master-data')
      .then((res) => res.json())
      .then((d) => setMasterData({ pillars: d.pillars || [], platforms: d.platforms || [] }))
      .catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Content activity, workflow attention items, and performance overview."
      />

      <Card>
        <CardContent className="p-4">
          <FilterBar filters={filters} onChange={setFilters} masterData={masterData} />
        </CardContent>
      </Card>

      {loading || !data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SkeletonKPI />
            <SkeletonKPI />
            <SkeletonKPI />
            <SkeletonKPI />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SkeletonCard className="h-72" />
            <SkeletonCard className="h-72" />
          </div>
          <SkeletonCard className="h-72" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Content"
              icon={FileText}
              value={String(data.kpis.content.total)}
              hint={`${data.kpis.content.published} published`}
            />
            <KpiCard
              title="Total Views"
              icon={Eye}
              value={data.kpis.performance.totalViews.toLocaleString()}
            />
            <KpiCard
              title="Engagement Rate"
              icon={TrendingUp}
              value={`${data.kpis.performance.avgEngagementRate.toFixed(2)}%`}
              hint="avg per publication"
              hintTitle={ENGAGEMENT_FORMULA}
            />
            <KpiCard
              title="Pending Action"
              icon={ClipboardCheck}
              iconClass="text-warning"
              value={String(data.kpis.content.pendingReview + data.kpis.content.approved)}
              hint={`${data.kpis.content.pendingReview} review, ${data.kpis.content.approved} approve`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title="Total Likes"
              icon={Heart}
              iconClass="text-danger"
              value={data.kpis.performance.totalLikes.toLocaleString()}
            />
            <KpiCard
              title="Total Comments"
              icon={MessageCircle}
              iconClass="text-info"
              value={data.kpis.performance.totalComments.toLocaleString()}
            />
            <KpiCard
              title="Total Shares"
              icon={Share2}
              iconClass="text-success"
              value={data.kpis.performance.totalShares.toLocaleString()}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {data.statusBreakdown.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-muted">No data</p>
                ) : (
                  <>
                    <div role="img" aria-label="Bar chart of content count by status">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.statusBreakdown} layout="vertical" margin={{ left: 8, right: 24 }}>
                          <CartesianGrid {...GRID_PROPS} horizontal={false} />
                          <XAxis type="number" {...AXIS_PROPS} allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="label"
                            width={128}
                            {...AXIS_PROPS}
                            tick={{ ...AXIS_PROPS.tick, fontSize: 11 }}
                          />
                          <Tooltip
                            cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
                            content={(props) => <ChartTooltip {...props} formatter={formatNumber} />}
                          />
                          <Bar dataKey="count" name="Content" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={16}>
                            <LabelList
                              dataKey="count"
                              position="right"
                              style={{ fontSize: 11, fill: '#4b5563' }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="sr-only">
                      {data.statusBreakdown.map((s) => (
                        <li key={s.status}>{`${s.label}: ${s.count} content`}</li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Views by Platform</CardTitle>
              </CardHeader>
              <CardContent>
                {data.platformPerformance.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-muted">No data</p>
                ) : (
                  <>
                    <div role="img" aria-label="Bar chart of views by platform">
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.platformPerformance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid {...GRID_PROPS} />
                          <XAxis dataKey="platform" {...AXIS_PROPS} tick={{ ...AXIS_PROPS.tick, fontSize: 11 }} />
                          <YAxis {...AXIS_PROPS} tickFormatter={formatNumber} width={56} />
                          <Tooltip
                            cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
                            content={(props) => <ChartTooltip {...props} formatter={formatNumber} />}
                          />
                          <Bar dataKey="views" name="Views" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="sr-only">
                      {data.platformPerformance.map((p) => (
                        <li key={p.platform}>{`${p.platform}: ${formatNumber(p.views)} views`}</li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Planning vs Actual Publishing &amp; Performance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.monthlyTrend.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">No data</p>
              ) : (
                <>
                  <div role="img" aria-label="Line chart of planned, published, and views per month">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={data.monthlyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="label" {...AXIS_PROPS} />
                        <YAxis yAxisId="left" {...AXIS_PROPS} width={48} />
                        <YAxis yAxisId="right" orientation="right" {...AXIS_PROPS} tickFormatter={formatNumber} width={64} />
                        <Tooltip
                          content={(props) => <ChartTooltip {...props} formatter={formatNumber} />}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="planned"
                          stroke="#9ca3af"
                          name="Planned"
                          strokeWidth={2}
                          strokeDasharray="5 4"
                          dot={false}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="published"
                          stroke="#059669"
                          name="Published"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="views"
                          stroke="#2563eb"
                          name="Views"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="sr-only">
                    {data.monthlyTrend.map((m) => (
                      <li key={m.label}>{`${m.label}: planned ${m.planned}, published ${m.published}, views ${formatNumber(m.views)}`}</li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Performing Content</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topContent.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">
                  No performance data recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.topContent.map((c, i) => (
                    <div
                      key={c.contentId}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            i === 0
                              ? 'bg-warning-soft text-warning'
                              : i === 1
                                ? 'bg-primary-soft text-primary'
                                : i === 2
                                  ? 'bg-info-soft text-info'
                                  : 'bg-surface-muted text-ink-muted'
                          }`}
                          aria-hidden="true"
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/content/${c.contentId}`}
                            className="block truncate font-medium text-primary hover:underline"
                          >
                            {c.title}
                          </Link>
                          <p className="text-xs text-ink-muted">{c.platform}</p>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0 text-right">
                        <p className="text-sm font-medium">
                          {c.views.toLocaleString()} views
                        </p>
                        <p className="text-xs text-success">
                          {c.engagementRate.toFixed(2)}% engagement
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
