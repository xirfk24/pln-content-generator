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
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SkeletonCard, SkeletonKPI } from '@/components/ui/skeleton'
import {
  ENGAGEMENT_FORMULA,
  CONTENT_STATUS_LABELS,
  PLN_TOPIC_OPTIONS,
  CONTENT_PILLAR_OPTIONS,
} from '@/constants'
import {
  AXIS_PROPS,
  GRID_PROPS,
  CHART_COLORS,
  ChartTooltip,
  formatNumber,
  formatPercent,
} from '@/lib/charts'
import { formatDate } from '@/lib/utils'
import {
  Filter,
  RotateCcw,
  CalendarRange,
  Calendar,
  Layers,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Eye,
  Activity,
  ChevronDown,
  ChevronUp,
  FileBarChart,
  AlertCircle,
} from 'lucide-react'
import type { PlanningPeriod } from '@/types'

const INDO_MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

interface MonthOption {
  key: string
  name: string
  startDate: string
  endDate: string
}

interface AnalyticsData {
  kpis?: {
    content?: {
      total: number
      draft: number
      planned: number
      production: number
      pendingReview: number
      pendingProductionReview: number
      approved: number
      readyToPublish: number
      published: number
      rejected: number
      rescheduled: number
      notRealized: number
    }
    performance?: {
      totalViews: number
      totalLikes: number
      totalComments: number
      totalShares: number
      totalSaves: number
      totalReach: number
      avgEngagementRate: number
    }
  }
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
  topicPerformance?: Array<{
    topic: string
    topicCode?: string
    contentCount: number
    publishedCount: number
    views: number
    avgViews: number
    totalEngagement: number
    avgEngagementRate: number
  }>
  monthlyTrend: Array<{
    month: string
    label: string
    planned: number
    published: number
    realizationRate: number
    engagementRate: number
  }>
  semesterTrend: Array<{
    month: string
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
  const [error, setError] = useState<string | null>(null)

  // Master Planning Periods & Taxonomy
  const [periods, setPeriods] = useState<PlanningPeriod[]>([])
  const [masterData, setMasterData] = useState<{
    pillars: Array<{ id: string; name: string }>
    platforms: Array<{ id: string; name: string }>
  }>({ pillars: [], platforms: [] })

  // Active filter state
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('ALL')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [platformId, setPlatformId] = useState<string>('')
  const [pillarId, setPillarId] = useState<string>('')
  const [topicFilter, setTopicFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Advanced date filter toggle
  const [showAdvancedDate, setShowAdvancedDate] = useState(false)
  const [trendMode, setTrendMode] = useState<'monthly' | 'semester'>('monthly')

  // 1. Initial Load of Master Data & Planning Periods
  useEffect(() => {
    Promise.all([
      apiFetch('/api/planning-periods').then((r) => (r.ok ? r.json() : { periods: [] })),
      apiFetch('/api/master-data').then((r) => (r.ok ? r.json() : { pillars: [], platforms: [] })),
    ])
      .then(([periodRes, masterRes]) => {
        const pList: PlanningPeriod[] = periodRes.periods || []
        setPeriods(pList)
        setMasterData({
          pillars: masterRes.pillars || [],
          platforms: masterRes.platforms || [],
        })

        // Default to active period, or the first available period
        const activePeriod = pList.find((p) => p.status === 'AKTIF') || pList[0]
        if (activePeriod) {
          setSelectedPeriodId(activePeriod.id)
          setDateFrom(activePeriod.start_date)
          setDateTo(activePeriod.end_date)
        }
      })
      .catch((err) => {
        console.error('Failed to load initial analytics metadata:', err)
      })
  }, [])

  // 2. Compute current period object
  const currentPeriod = useMemo(() => {
    return periods.find((p) => p.id === selectedPeriodId) || null
  }, [periods, selectedPeriodId])

  // 3. Compute dynamic list of months dependent on selected semester
  const availableMonths = useMemo<MonthOption[]>(() => {
    if (!currentPeriod || !currentPeriod.start_date || !currentPeriod.end_date) return []

    const start = new Date(currentPeriod.start_date)
    const end = new Date(currentPeriod.end_date)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return []

    const months: MonthOption[] = []
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    const last = new Date(end.getFullYear(), end.getMonth(), 1)

    while (cur <= last) {
      const y = cur.getFullYear()
      const m = cur.getMonth()
      const mKey = `${y}-${String(m + 1).padStart(2, '0')}`
      const mName = `${INDO_MONTH_NAMES[m]} ${y}`

      const mStart = `${y}-${String(m + 1).padStart(2, '0')}-01`
      const lastDay = new Date(y, m + 1, 0).getDate()
      const mEnd = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      months.push({
        key: mKey,
        name: mName,
        startDate: mStart,
        endDate: mEnd,
      })
      cur.setMonth(cur.getMonth() + 1)
    }

    return months
  }, [currentPeriod])

  // Handle Period Change
  const handlePeriodChange = (pId: string) => {
    setSelectedPeriodId(pId)
    setSelectedMonthKey('ALL')

    if (pId === 'ALL') {
      setDateFrom('')
      setDateTo('')
    } else {
      const p = periods.find((item) => item.id === pId)
      if (p) {
        setDateFrom(p.start_date)
        setDateTo(p.end_date)
      }
    }
  }

  // Handle Month Change
  const handleMonthChange = (mKey: string) => {
    setSelectedMonthKey(mKey)

    if (mKey === 'ALL') {
      if (currentPeriod) {
        setDateFrom(currentPeriod.start_date)
        setDateTo(currentPeriod.end_date)
      }
    } else {
      const mOpt = availableMonths.find((m) => m.key === mKey)
      if (mOpt) {
        setDateFrom(mOpt.startDate)
        setDateTo(mOpt.endDate)
      }
    }
  }

  // Reset Filters
  const handleResetFilters = () => {
    const activeP = periods.find((p) => p.status === 'AKTIF') || periods[0]
    if (activeP) {
      setSelectedPeriodId(activeP.id)
      setSelectedMonthKey('ALL')
      setDateFrom(activeP.start_date)
      setDateTo(activeP.end_date)
    } else {
      setSelectedPeriodId('ALL')
      setSelectedMonthKey('ALL')
      setDateFrom('')
      setDateTo('')
    }
    setPlatformId('')
    setPillarId('')
    setStatusFilter('')
  }

  // Load Analytics Data from Backend
  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (platformId) params.set('platform_id', platformId)
      if (pillarId) params.set('pillar_id', pillarId)
      if (statusFilter) params.set('status', statusFilter)

      const [analyticsRes, recapRes] = await Promise.all([
        apiFetch(`/api/analytics?${params.toString()}`),
        apiFetch(`/api/analytics/topic-recap?${params.toString()}`),
      ])

      if (analyticsRes.ok) {
        const analyticsJson = await analyticsRes.json()
        setData(analyticsJson)
      } else {
        const errJson = await analyticsRes.json().catch(() => ({}))
        setError(errJson.error || 'Gagal memuat data analisis.')
      }

      if (recapRes.ok) {
        setRecap(await recapRes.json())
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err)
      setError('Terjadi kesalahan jaringan saat memuat analisis.')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, platformId, pillarId, statusFilter])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  // Trend data according to mode
  const trendData = useMemo(() => {
    return trendMode === 'semester' ? data?.semesterTrend ?? [] : data?.monthlyTrend ?? []
  }, [data, trendMode])

  // Context label of current period
  const activePeriodContextLabel = useMemo(() => {
    if (selectedPeriodId === 'ALL') {
      if (dateFrom && dateTo) {
        return `Kustom (${formatDate(dateFrom)} – ${formatDate(dateTo)})`
      }
      return 'Semua Periode'
    }

    if (currentPeriod) {
      if (selectedMonthKey !== 'ALL') {
        const m = availableMonths.find((item) => item.key === selectedMonthKey)
        return `${currentPeriod.name} • Bulan ${m?.name || selectedMonthKey}`
      }
      return `${currentPeriod.name} (${formatDate(currentPeriod.start_date)} – ${formatDate(currentPeriod.end_date)})`
    }

    return 'Periode Analisis'
  }, [selectedPeriodId, currentPeriod, selectedMonthKey, availableMonths, dateFrom, dateTo])

  // KPIs derived from API
  const totalContent = data?.kpis?.content?.total ?? 0
  const publishedContent = data?.kpis?.content?.published ?? 0
  const unPublishedContent = Math.max(0, totalContent - publishedContent)
  const publishedPercent = totalContent > 0 ? Math.round((publishedContent / totalContent) * 100) : 0

  const totalViews = data?.kpis?.performance?.totalViews ?? 0
  const avgER = data?.kpis?.performance?.avgEngagementRate ?? 0

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Header & Periode Analisis Context */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#00A2B9]" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Ringkasan Analisis
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Analisis performa dan efektivitas konten berdasarkan periode perencanaan.
          </p>
        </div>

        {/* Periode Context Badge */}
        <div className="flex items-center gap-2 self-start rounded-xl border border-sky-200 bg-sky-50/70 px-3.5 py-2 text-xs text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200 sm:self-auto">
          <CalendarRange className="h-4 w-4 text-[#00A2B9] shrink-0" />
          <div>
            <p className="font-semibold">{activePeriodContextLabel}</p>
          </div>
          {currentPeriod?.status === 'AKTIF' && (
            <span className="ml-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              Aktif
            </span>
          )}
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <Card className="border-slate-200/80 shadow-sm dark:border-slate-800">
        <CardContent className="p-4 space-y-3.5">
          {/* Header Filter */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Filter className="h-3.5 w-3.5 text-[#00A2B9]" />
              <span>Filter Periode Perencanaan & Kriteria Analisis</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedDate(!showAdvancedDate)}
                className="h-7 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                {showAdvancedDate ? (
                  <>
                    <ChevronUp className="mr-1 h-3.5 w-3.5" />
                    Tutup Filter Tanggal
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-3.5 w-3.5" />
                    Filter Tanggal Kustom
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick Select Filter Row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {/* 1. Periode Rencana */}
            <div className="space-y-1">
              <label htmlFor="analytics-period" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Periode Master
              </label>
              <Select
                id="analytics-period"
                value={selectedPeriodId}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="text-xs font-medium"
              >
                <option value="ALL">Semua Periode</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.status === 'AKTIF' ? '(Aktif)' : ''}
                  </option>
                ))}
              </Select>
            </div>

            {/* 2. Bulan di Semester */}
            <div className="space-y-1">
              <label htmlFor="analytics-month" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Bulan Pelaksanaan
              </label>
              <Select
                id="analytics-month"
                value={selectedMonthKey}
                onChange={(e) => handleMonthChange(e.target.value)}
                disabled={selectedPeriodId === 'ALL'}
                className="text-xs font-medium"
              >
                <option value="ALL">Semua Bulan di Semester Ini</option>
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* 3. Platform Media (Tanpa LinkedIn, Website, Twitter/X) */}
            <div className="space-y-1">
              <label htmlFor="analytics-platform" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Platform
              </label>
              <Select
                id="analytics-platform"
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
                className="text-xs font-normal"
              >
                <option value="">Semua Platform</option>
                {masterData.platforms
                  .filter(
                    (p) =>
                      !['linkedin', 'website', 'twitter/x', 'twitter', 'x'].includes(
                        p.name.toLowerCase().trim()
                      )
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </div>

            {/* 4. Topik Konten (A - Z) */}
            <div className="space-y-1">
              <label htmlFor="analytics-topic" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Topik Konten
              </label>
              <Select
                id="analytics-topic"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="text-xs font-normal"
              >
                <option value="">Semua Topik Konten</option>
                {PLN_TOPIC_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>

            {/* 5. Content Pillar */}
            <div className="space-y-1">
              <label htmlFor="analytics-pillar" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Content Pillar
              </label>
              <Select
                id="analytics-pillar"
                value={pillarId}
                onChange={(e) => setPillarId(e.target.value)}
                className="text-xs font-normal"
              >
                <option value="">Semua Content Pillar</option>
                {CONTENT_PILLAR_OPTIONS.map((cp) => {
                  const match = masterData.pillars.find(
                    (p) =>
                      p.name.toLowerCase() === cp.toLowerCase() ||
                      p.name.toLowerCase().startsWith(cp.split(' ')[0].toLowerCase())
                  )
                  const val = match ? match.id : cp
                  return (
                    <option key={cp} value={val}>
                      {cp}
                    </option>
                  )
                })}
              </Select>
            </div>

            {/* 6. Status Konten */}
            <div className="space-y-1">
              <label htmlFor="analytics-status" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Status Konten
              </label>
              <Select
                id="analytics-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-normal"
              >
                <option value="">Semua Status</option>
                <option value="PUBLISHED">Dipublikasikan</option>
                <option value="READY_TO_PUBLISH">Siap Publikasi</option>
                <option value="APPROVED">Konsep Disetujui</option>
                <option value="PRODUCTION">Produksi Konten</option>
                <option value="PENDING_REVIEW">Menunggu Review Konsep</option>
                <option value="DRAFT">Draft</option>
              </Select>
            </div>
          </div>

          {/* Advanced Custom Date Filter (Collapsible) */}
          {showAdvancedDate && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <label htmlFor="analytics-date-from" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Dari Tanggal (Kustom)
                </label>
                <Input
                  id="analytics-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setSelectedMonthKey('ALL')
                  }}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="analytics-date-to" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Sampai Tanggal (Kustom)
                </label>
                <Input
                  id="analytics-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setSelectedMonthKey('ALL')
                  }}
                  className="text-xs"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-5">
            <SkeletonKPI />
            <SkeletonKPI />
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
      ) : !data ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Belum ada data pada periode ini.
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Silakan pilih periode perencanaan lain atau sesuaikan kriteria filter data.
          </p>
        </div>
      ) : (
        <>
          {/* Executive KPI Summary Cards (5 Cards) */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            {/* KPI 1: Total Konten */}
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 shadow-sm dark:border-sky-950/40 dark:bg-sky-950/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Konten
                </p>
                <Layers className="h-4 w-4 text-[#00A2B9]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {totalContent}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Rencana periode ini
              </p>
            </div>

            {/* KPI 2: Diterbitkan */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-950/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Diterbitkan
                </p>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {publishedContent}
                </p>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[11px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  {publishedPercent}%
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                Realisasi publikasi
              </p>
            </div>

            {/* KPI 3: Belum Terbit */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm dark:border-amber-950/40 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  Belum Terbit
                </p>
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-800 dark:text-amber-300">
                {unPublishedContent}
              </p>
              <p className="mt-0.5 text-[11px] text-amber-600/80 dark:text-amber-400/80">
                Draft, produksi & antrean
              </p>
            </div>

            {/* KPI 4: Total Tayangan */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 shadow-sm dark:border-blue-950/40 dark:bg-blue-950/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-400">
                  Total Tayangan
                </p>
                <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-200">
                {formatNumber(totalViews)}
              </p>
              <p className="mt-0.5 text-[11px] text-blue-600/80 dark:text-blue-400/80">
                Total penayangan konten
              </p>
            </div>

            {/* KPI 5: Engagement Rate */}
            <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 shadow-sm dark:border-purple-950/40 dark:bg-purple-950/20 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-800 dark:text-purple-400">
                  Engagement Rate
                </p>
                <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-purple-900 dark:text-purple-200">
                {formatPercent(avgER)}
              </p>
              <p className="mt-0.5 text-[11px] text-purple-600/80 dark:text-purple-400/80">
                Rata-rata interaksi audiens
              </p>
            </div>
          </div>

          {/* Tren Bulanan: Rencana vs Realisasi Terbit (Mengikuti Periode Perencanaan) */}
          <Card className="border-slate-200/80 shadow-sm dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 py-3.5 px-5 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#00A2B9]" />
                    {trendMode === 'semester'
                      ? `Tren Semester: Rencana vs Realisasi Terbit`
                      : `Tren Bulanan: Rencana vs Realisasi Terbit`}
                  </CardTitle>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Membandingkan jumlah rencana konten dengan realisasi publikasi pada {activePeriodContextLabel}
                  </p>
                </div>

                <div
                  className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900"
                  role="group"
                  aria-label="Mode periode tren"
                >
                  {(['monthly', 'semester'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTrendMode(m)}
                      aria-pressed={trendMode === m}
                      className={
                        'rounded-md px-3 py-1 text-xs font-medium transition-colors ' +
                        (trendMode === m
                          ? 'bg-white text-primary shadow-xs font-semibold dark:bg-slate-800 dark:text-white'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white')
                      }
                    >
                      {m === 'monthly' ? 'Bulanan' : 'Semester'}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              {trendData.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  Belum ada data tren untuk periode ini.
                </p>
              ) : (
                <>
                  <div role="img" aria-label="Diagram batang tren rencana vs publikasi">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="label" {...AXIS_PROPS} tick={{ ...AXIS_PROPS.tick, fontSize: 11 }} />
                        <YAxis {...AXIS_PROPS} allowDecimals={false} width={40} />
                        <Tooltip
                          cursor={{ fill: 'rgba(0, 162, 185, 0.06)' }}
                          content={(props) => <ChartTooltip {...props} formatter={formatNumber} />}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8, fontFamily: "'Poppins', sans-serif" }} />
                        <Bar
                          dataKey="planned"
                          name="Rencana Konten"
                          fill="#94A3B8"
                          radius={[3, 3, 0, 0]}
                        />
                        <Bar
                          dataKey="published"
                          name="Diterbitkan"
                          fill="#00A2B9"
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tabel Tren Bulanan / Semester */}
                  <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300">
                            {trendMode === 'semester' ? 'Semester' : 'Bulan'}
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                            Rencana
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                            Terbit
                          </th>
                          <th className="px-4 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">
                            Rasio Ketercapaian
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {trendData.map((m) => {
                          const hasPlanned = m.planned > 0
                          const rate = hasPlanned ? m.realizationRate : 0

                          return (
                            <tr
                              key={m.label}
                              className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                            >
                              <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                                {m.label}
                              </td>
                              <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300 font-medium">
                                {m.planned}
                              </td>
                              <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-300 font-medium">
                                {m.published}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {!hasPlanned ? (
                                  <span className="text-slate-400">-</span>
                                ) : (
                                  <span
                                    className={`inline-block font-semibold ${
                                      rate >= 80
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : rate >= 50
                                          ? 'text-amber-600 dark:text-amber-400'
                                          : 'text-rose-600 dark:text-rose-400'
                                    }`}
                                  >
                                    {rate.toFixed(0)}%
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Charts Row: Platform Performance & Engagement Rate */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Chart 1: Performa Berdasarkan Platform */}
            <Card className="border-slate-200/80 shadow-sm dark:border-slate-800">
              <CardHeader className="border-b border-slate-100 py-3.5 px-5 dark:border-slate-800">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Performa Berdasarkan Platform
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {data.platformPerformance.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">Belum ada data platform</p>
                ) : (
                  <div role="img" aria-label="Diagram batang performa per platform">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.platformPerformance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="platform" {...AXIS_PROPS} tick={{ ...AXIS_PROPS.tick, fontSize: 11 }} />
                        <YAxis {...AXIS_PROPS} tickFormatter={formatNumber} width={50} />
                        <Tooltip
                          cursor={{ fill: 'rgba(0, 162, 185, 0.06)' }}
                          content={(props) => <ChartTooltip {...props} formatter={formatNumber} />}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8, fontFamily: "'Poppins', sans-serif" }} />
                        <Bar dataKey="views" name="Penayangan" fill="#00A2B9" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="likes" name="Suka" fill="#E11D48" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="shares" name="Bagikan" fill="#10B981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Tingkat Interaksi (Engagement Rate) per Platform */}
            <Card className="border-slate-200/80 shadow-sm dark:border-slate-800">
              <CardHeader className="border-b border-slate-100 py-3.5 px-5 dark:border-slate-800">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Tingkat Interaksi (Engagement Rate) per Platform
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {data.platformPerformance.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">Belum ada data interaksi</p>
                ) : (
                  <div role="img" aria-label="Diagram batang tingkat interaksi per platform">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.platformPerformance} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid {...GRID_PROPS} />
                        <XAxis dataKey="platform" {...AXIS_PROPS} tick={{ ...AXIS_PROPS.tick, fontSize: 11 }} />
                        <YAxis {...AXIS_PROPS} unit="%" width={45} />
                        <Tooltip
                          cursor={{ fill: 'rgba(124, 58, 237, 0.06)' }}
                          content={(props) => <ChartTooltip {...props} formatter={formatPercent} />}
                        />
                        <Bar dataKey="engagementRate" name="Tingkat Interaksi" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Table: Performa Berdasarkan Topik Konten */}
          <Card className="border-slate-200/80 shadow-sm dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 py-3.5 px-5 dark:border-slate-800">
              <div className="flex flex-col gap-0.5">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Performa Berdasarkan Topik Konten
                </CardTitle>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Rincian ketercapaian dan interaksi konten per topik konten resmi pada {activePeriodContextLabel}
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {(!data.topicPerformance || data.topicPerformance.length === 0) ? (
                <p className="py-8 text-center text-xs text-slate-500">Belum ada data performa topik konten</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Kode
                        </th>
                        <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Topik Konten
                        </th>
                        <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Total Konten
                        </th>
                        <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Terbit
                        </th>
                        <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Penayangan
                        </th>
                        <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Rata-rata Tayang
                        </th>
                        <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Interaksi
                        </th>
                        <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          ER (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {data.topicPerformance.map((p) => {
                        const code =
                          p.topicCode ||
                          (p.topic.length >= 3 && p.topic[1] === ' ' && p.topic[2] === '-'
                            ? p.topic[0]
                            : '-')
                        return (
                          <tr
                            key={p.topic}
                            className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                          >
                            <td className="px-4 py-3">
                              <span className="inline-block rounded bg-primary-soft text-primary font-bold px-2 py-0.5 text-xs">
                                {code}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                              {p.topic}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                              {p.contentCount}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                              {p.publishedCount}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                              {p.views.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                              {p.avgViews.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">
                              {p.totalEngagement.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                              {p.avgEngagementRate.toFixed(2)}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-400">{ENGAGEMENT_FORMULA}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rekapitulasi Jumlah Topik (Kode A-Z) */}
          {recap && recap.recap.length > 0 && (
            <Card className="border-slate-200/80 shadow-sm dark:border-slate-800">
              <CardHeader className="border-b border-slate-100 py-3.5 px-5 dark:border-slate-800">
                <div className="flex flex-col gap-0.5">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Rekapitulasi Jumlah Topik (Kode A-Z)
                  </CardTitle>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Distribusi topik perencanaan konten • Total:{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {recap.total} konten
                    </span>
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {recap.recap.map((row) => (
                    <div
                      key={row.code}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sky-100 text-[11px] font-bold text-[#00A2B9] dark:bg-sky-950/60 dark:text-sky-300">
                          {row.code}
                        </span>
                        <span className="truncate text-slate-700 dark:text-slate-300 font-medium" title={row.topic}>
                          {row.topic}
                        </span>
                      </div>
                      <span className="ml-2 shrink-0 font-bold text-slate-900 dark:text-white">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer Link to Performance Analytics */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
            Ingin menganalisis rincian performa per masing-masing konten?{' '}
            <Link
              href="/analytics/performance"
              className="font-semibold text-[#00A2B9] hover:underline"
            >
              Buka Modul Performa Konten →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
