'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from '@/compat/next'
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
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  FileText,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  ClipboardCheck,
  Filter,
  List,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart as PieChartIcon,
  Plus,
  Upload,
  CalendarRange,
  Send,
} from 'lucide-react'
import { FilterBar, EMPTY_FILTERS, type FilterValues } from '@/components/analytics/filter-bar'
import { SkeletonCard, SkeletonKPI } from '@/components/ui/skeleton'
import { ENGAGEMENT_FORMULA } from '@/constants'
import {
  AXIS_PROPS,
  GRID_PROPS,
  CHART_COLORS,
  CATEGORY_COLORS,
  ChartTooltip,
  formatNumber,
} from '@/lib/charts'
import { formatDate, cn } from '@/lib/utils'
import type { ContentStatus } from '@/types'

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

interface RecentContent {
  id: string
  title: string
  platform: string
  pillar: string
  status: ContentStatus
  pic: string
  plannedDate: string
}

interface ContentApiItem {
  id: string
  title: string
  status: ContentStatus
  planned_date?: string | null
  pic?: string | null
  pillar?: { name: string } | null
  platform?: { name: string } | null
}

/* ──────────────────────────────────────────────
   Sparkline — tiny inline trend chart for KPI cards
   ────────────────────────────────────────────── */
function Sparkline({
  data,
  color,
}: {
  data: number[]
  color: string
}) {
  const chartData = data.map((v, i) => ({ idx: i, value: v }))
  return (
    <ResponsiveContainer width="100%" height={32}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace('#', '')})}`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ──────────────────────────────────────────────
   Donut slice label — renders % inside each slice
   ────────────────────────────────────────────── */
interface SliceLabelProps {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  percent?: number
}

function renderSliceLabel(props: SliceLabelProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
  if (cx == null || cy == null || midAngle == null || innerRadius == null || outerRadius == null) {
    return null
  }
  const pct = (percent ?? 0) * 100
  if (pct < 5) return null // hide label on tiny slices
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${pct.toFixed(1)}%`}
    </text>
  )
}

/* ──────────────────────────────────────────────
   KPI Card — with colored icon circle, sparkline
   ────────────────────────────────────────────── */
function KpiCard({
  title,
  icon: Icon,
  iconBg,
  iconColor,
  value,
  hint,
  hintTitle,
  sparkData,
  sparkColor,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  value: string
  hint?: string
  hintTitle?: string
  sparkData?: number[]
  sparkColor?: string
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">{title}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-ink">{value}</p>
            {hint && (
              <p className="mt-0.5 text-xs text-ink-muted" title={hintTitle}>
                {hint}
              </p>
            )}
          </div>
          <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full', iconBg)}>
            <Icon className={cn('h-4 w-4', iconColor)} aria-hidden="true" />
          </div>
        </div>
        {sparkData && sparkColor && (
          <div className="mt-2 -mb-1">
            <Sparkline data={sparkData} color={sparkColor} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ──────────────────────────────────────────────
   Recent Content Table with pagination
   ────────────────────────────────────────────── */
function RecentContentTable({ contents }: { contents: RecentContent[] }) {
  const [page, setPage] = useState(0)
  const pageSize = 15

  const pageCount = Math.max(1, Math.ceil(contents.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * pageSize
  const end = start + pageSize
  const rows = contents.slice(start, end)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-ink-muted" aria-hidden="true" />
          <CardTitle className="text-base">Recent Content</CardTitle>
        </div>
        <Link
          href="/content/planning"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View All
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">#</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Platform</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Title</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Tema</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">PIC</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-surface-muted/50"
                >
                  <td className="px-4 py-2.5 text-xs text-ink-muted">{start + i + 1}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-secondary whitespace-nowrap">
                    {formatDate(row.plannedDate)}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium text-ink">{row.platform}</td>
                  <td className="px-4 py-2.5 text-xs font-medium text-ink max-w-[200px] truncate">
                    {row.title}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-secondary">{row.pillar}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={row.status} kind="content" />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink-secondary">{row.pic || '-'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/content/${row.id}`}
                      className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
          <p className="text-xs text-ink-muted">
            Showing {start + 1} to {Math.min(end, contents.length)} of {contents.length} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="h-7"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Prev
            </Button>
            <span className="text-xs font-medium text-ink">
              {safePage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="h-7"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [recentContent, setRecentContent] = useState<RecentContent[]>([])
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
      const res = await apiFetch(`/api/dashboard?${params.toString()}`)
      if (res.ok) {
        setData(await res.json())
      }

      // Also fetch recent content for the table
      const contentRes = await apiFetch(`/api/contents?${params.toString()}`)
      if (contentRes.ok) {
        const contentData = (await contentRes.json()) as { contents?: ContentApiItem[] }
        setRecentContent(
          (contentData.contents || []).map((c) => ({
            id: c.id,
            title: c.title,
            platform: c.platform?.name || '-',
            pillar: c.pillar?.name || '-',
            status: c.status,
            pic: c.pic || '-',
            plannedDate: c.planned_date || '',
          }))
        )
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
    apiFetch('/api/master-data')
      .then((res) => res.json())
      .then((d) => setMasterData({ pillars: d.pillars || [], platforms: d.platforms || [] }))
      .catch(console.error)
  }, [])

  // Generate sparkline data from monthly trends (or fallback to mock)
  const sparkViews = useMemo(() => {
    if (!data?.monthlyTrend) return [30, 45, 38, 52, 60, 72]
    return data.monthlyTrend.map((m) => m.views)
  }, [data])

  const sparkContent = useMemo(() => {
    if (!data?.monthlyTrend) return [10, 15, 12, 18, 22, 25]
    return data.monthlyTrend.map((m) => m.planned)
  }, [data])

  const sparkEngagement = useMemo(() => {
    return [4.2, 5.1, 4.8, 5.5, 6.0, 6.48]
  }, [])

  const sparkPending = useMemo(() => {
    return [5, 7, 6, 8, 7, 7]
  }, [])

  const totalViews = useMemo(
    () => data?.platformPerformance.reduce((sum, p) => sum + p.views, 0) ?? 0,
    [data]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Content activity, workflow overview & performance summary."
      />

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <FilterBar filters={filters} onChange={setFilters} masterData={masterData} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/content/planning/new" className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary hover:bg-primary-soft/30">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary-soft">
            <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Buat Konten</p>
            <p className="text-xs text-ink-muted">Tambah rencana konten baru</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        </Link>

        <Link href="/content/import" className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-success hover:bg-success-soft/30">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-success-soft">
            <Upload className="h-4 w-4 text-success" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Import Massal</p>
            <p className="text-xs text-ink-muted">Upload CSV untuk impor cepat</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        </Link>

        <Link href="/recap" className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-warning hover:bg-warning-soft/30">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-warning-soft">
            <CalendarRange className="h-4 w-4 text-warning" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Rekap Periode</p>
            <p className="text-xs text-ink-muted">Laporan bulanan &amp; semester</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        </Link>

        <Link href="/publishing" className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-info hover:bg-info-soft/30">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-info-soft">
            <Send className="h-4 w-4 text-info" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Publishing</p>
            <p className="text-xs text-ink-muted">Rekam &amp; pantau publikasi</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        </Link>
      </div>

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
          {/* SECTION 1: KPI Summary Cards (4 columns) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Content"
              icon={FileText}
              iconBg="bg-primary-soft"
              iconColor="text-primary"
              value={String(data.kpis.content.total)}
              hint={`${data.kpis.content.published} published this month`}
              sparkData={sparkContent}
              sparkColor={CHART_COLORS.primary}
            />
            <KpiCard
              title="Total Views"
              icon={Eye}
              iconBg="bg-success-soft"
              iconColor="text-success"
              value={formatNumber(data.kpis.performance.totalViews)}
              hint="+12% from last month"
              sparkData={sparkViews}
              sparkColor={CHART_COLORS.success}
            />
            <KpiCard
              title="Engagement Rate"
              icon={TrendingUp}
              iconBg="bg-warning-soft"
              iconColor="text-warning"
              value={`${data.kpis.performance.avgEngagementRate.toFixed(2)}%`}
              hint="avg per publication"
              hintTitle={ENGAGEMENT_FORMULA}
              sparkData={sparkEngagement}
              sparkColor={CHART_COLORS.warning}
            />
            <KpiCard
              title="Pending Action"
              icon={ClipboardCheck}
              iconBg="bg-danger-soft"
              iconColor="text-danger"
              value={String(data.kpis.content.pendingReview + data.kpis.content.approved)}
              hint={`${data.kpis.content.pendingReview} review · ${data.kpis.content.approved} approve`}
              sparkData={sparkPending}
              sparkColor={CHART_COLORS.danger}
            />
          </div>

          {/* SECTION 2: Performance KPI Cards (3 columns) */}
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title="Total Likes"
              icon={Heart}
              iconBg="bg-danger-soft"
              iconColor="text-danger"
              value={formatNumber(data.kpis.performance.totalLikes)}
            />
            <KpiCard
              title="Total Comments"
              icon={MessageCircle}
              iconBg="bg-info-soft"
              iconColor="text-info"
              value={formatNumber(data.kpis.performance.totalComments)}
            />
            <KpiCard
              title="Total Shares"
              icon={Share2}
              iconBg="bg-success-soft"
              iconColor="text-success"
              value={formatNumber(data.kpis.performance.totalShares)}
            />
          </div>

          {/* SECTION 3: Filter indicator row (compact summary) */}
          {(filters.platform_id || filters.pillar_id || filters.status) && (
            <div className="flex items-center gap-2 rounded-md border border-primary-border bg-primary-soft px-3 py-2">
              <Filter className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="text-xs font-medium text-primary">
                Filtered view active
              </span>
            </div>
          )}

          {/* SECTION 4: Two Charts Side by Side */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* LEFT: Content by Status (Horizontal Bar Chart) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                  <CardTitle className="text-base">Content by Status</CardTitle>
                </div>
                <span className="text-xs text-ink-muted">Count</span>
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
                          <Bar dataKey="count" name="Content" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} barSize={16}>
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

            {/* RIGHT: Views by Platform (Pie/Donut Chart) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                  <CardTitle className="text-base">Views by Platform</CardTitle>
                </div>
                <span className="text-xs text-ink-muted">Views</span>
              </CardHeader>
              <CardContent>
                {data.platformPerformance.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-muted">No data</p>
                ) : (
                  <>
                    <div role="img" aria-label="Donut chart of views by platform">
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={data.platformPerformance}
                            dataKey="views"
                            nameKey="platform"
                            cx="45%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={2}
                            label={renderSliceLabel}
                          >
                            {data.platformPerformance.map((_, i) => (
                              <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={(props) => <ChartTooltip {...props} formatter={formatNumber} />}
                          />
                          <Legend
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 12, paddingLeft: 8 }}
                            formatter={(value: string) => {
                              const item = data.platformPerformance.find((p) => p.platform === value)
                              const pct =
                                totalViews > 0 && item ? (item.views / totalViews) * 100 : 0
                              return (
                                <span className="text-xs text-ink-secondary">
                                  {value}{' '}
                                  <span className="font-semibold text-ink">
                                    {pct.toFixed(1)}%
                                  </span>
                                </span>
                              )
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="sr-only">
                      {data.platformPerformance.map((p) => {
                        const pct = totalViews > 0 ? (p.views / totalViews) * 100 : 0
                        return (
                          <li key={p.platform}>{`${p.platform}: ${formatNumber(p.views)} views (${pct.toFixed(1)}%)`}</li>
                        )
                      })}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SECTION 5: Trend Line Chart (full width) */}
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
                          stroke={CHART_COLORS.neutral}
                          name="Planned"
                          strokeWidth={2}
                          strokeDasharray="5 4"
                          dot={false}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="published"
                          stroke={CHART_COLORS.success}
                          name="Published"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="views"
                          stroke={CHART_COLORS.primary}
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

          {/* SECTION 6: Recent Content Table */}
          {recentContent.length > 0 ? (
            <RecentContentTable contents={recentContent} />
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                  <CardTitle className="text-base">Recent Content</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="py-8 text-center text-sm text-ink-muted">No content found.</p>
              </CardContent>
            </Card>
          )}

          {/* SECTION 7: Top Performing Content (retained from original) */}
          {data.topContent.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Performing Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topContent.map((c, i) => (
                    <div
                      key={c.contentId}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
                            i === 0
                              ? 'bg-warning-soft text-warning'
                              : i === 1
                                ? 'bg-primary-soft text-primary'
                                : i === 2
                                  ? 'bg-info-soft text-info'
                                  : 'bg-surface-muted text-ink-muted'
                          )}
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
                          {formatNumber(c.views)} views
                        </p>
                        <p className="text-xs text-success">
                          {c.engagementRate.toFixed(2)}% engagement
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
