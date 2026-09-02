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
  PieChart,
  Pie,
  Cell,
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

/* Chart colors aligned with design tokens (globals.css) */
const CHART = {
  primary: '#1d4ed8',
  success: '#067647',
  warning: '#b54708',
  info: '#175cd3',
  neutral: '#98a2b3',
}

const STATUS_COLORS = [
  '#1d4ed8', '#b54708', '#b42318', '#067647',
  '#175cd3', '#7c3aed', '#0e7490', '#4d7c0f',
  '#c2410c', '#475467',
]

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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Content</CardTitle>
                <FileText className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.kpis.content.total}</div>
                <p className="text-xs text-ink-muted">
                  {data.kpis.content.published} published
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.kpis.performance.totalViews.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.kpis.performance.avgEngagementRate.toFixed(2)}%
                </div>
                <p className="text-xs text-ink-muted" title={ENGAGEMENT_FORMULA}>
                  avg per publication
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Action</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-warning" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.kpis.content.pendingReview + data.kpis.content.approved}
                </div>
                <p className="text-xs text-ink-muted">
                  {data.kpis.content.pendingReview} review, {data.kpis.content.approved} approve
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                <Heart className="h-4 w-4 text-danger" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.kpis.performance.totalLikes.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
                <MessageCircle className="h-4 w-4 text-info" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.kpis.performance.totalComments.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
                <Share2 className="h-4 w-4 text-success" aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.kpis.performance.totalShares.toLocaleString()}
                </div>
              </CardContent>
            </Card>
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
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.statusBreakdown}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        labelLine={false}
                      >
                        {data.statusBreakdown.map((_, i) => (
                          <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
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
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.platformPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="platform" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="views" fill={CHART.primary} name="Views" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis yAxisId="left" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="planned"
                      stroke={CHART.neutral}
                      name="Planned"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="published"
                      stroke={CHART.success}
                      name="Published"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="views"
                      stroke={CHART.primary}
                      name="Views"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
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
                                ? 'bg-surface-muted text-ink-secondary'
                                : i === 2
                                  ? 'bg-warning-soft text-warning'
                                  : 'bg-surface-muted text-ink-muted'
                          }`}
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
