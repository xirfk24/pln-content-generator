'use client'

import { apiFetch } from '@/lib/api'
import {
  CONTENT_STATUS_LABELS,
  CONTENT_PURPOSE_LABELS,
  POSTING_CATEGORY_LABELS,
  CONTENT_PRIORITY_LABELS,
} from '@/constants'
import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Loader2,
  FileSpreadsheet,
  Download,
  FileBarChart,
  CalendarRange,
  Calendar,
  Layers,
  Filter,
  RotateCcw,
  CheckCircle2,
  Clock,
  FileEdit,
} from 'lucide-react'
import { formatDate, getAutoSemesters } from '@/lib/utils'
import { exportContentReportToExcel, type ReportItem } from '@/lib/excel-export'
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

export default function ReportsPage() {
  const [rows, setRows] = useState<ReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [exportingExcel, setExportingExcel] = useState(false)

  // Master data & Planning Periods
  const [periods, setPeriods] = useState<PlanningPeriod[]>([])
  const [masterData, setMasterData] = useState<{
    pillars: Array<{ id: string; name: string }>
    platforms: Array<{ id: string; name: string }>
  }>({ pillars: [], platforms: [] })

  // Active filters
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('ALL')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [platformId, setPlatformId] = useState<string>('')
  const [pillarId, setPillarId] = useState<string>('')
  const [status, setStatus] = useState<string>('PUBLISHED')

  const allPeriods = useMemo(() => {
    if (periods.length > 0) {
      return periods.map((p) => ({
        id: p.id,
        name: p.name,
        start_date: p.start_date,
        end_date: p.end_date,
      }))
    }
    return getAutoSemesters(3, 1)
  }, [periods])

  // 1. Load Master Data & Planning Periods on Mount
  useEffect(() => {
    Promise.all([
      apiFetch('/api/planning-periods').then((r) => (r.ok ? r.json() : { periods: [] })),
      apiFetch('/api/master-data').then((r) => (r.ok ? r.json() : { pillars: [], platforms: [] })),
    ])
      .then(([periodData, masterRes]) => {
        const pList: PlanningPeriod[] = periodData.periods || []
        setPeriods(pList)
        setMasterData({
          pillars: masterRes.pillars || [],
          platforms: (masterRes.platforms || []).filter(
            (p: { id: string; name: string }) =>
              !['website', 'linkedin'].includes(p.name.toLowerCase())
          ),
        })

        const activeP = pList.find((p) => p.status === 'AKTIF') || pList[0]
        if (activeP) {
          setSelectedPeriodId(activeP.id)
          setDateFrom(activeP.start_date)
          setDateTo(activeP.end_date)
        } else if (allPeriods.length > 0) {
          const firstP = allPeriods[0]
          setSelectedPeriodId(firstP.id)
          setDateFrom(firstP.start_date)
          setDateTo(firstP.end_date)
        }
      })
      .catch((err) => {
        console.error('Failed to load initial report filters:', err)
      })
  }, [])

  // 2. Compute dynamic months for the selected period
  const currentPeriod = useMemo(() => {
    return allPeriods.find((p) => p.id === selectedPeriodId) || null
  }, [allPeriods, selectedPeriodId])

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
      const lastDayDate = new Date(y, m + 1, 0)
      const mEnd = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`

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
      const p = allPeriods.find((item) => item.id === pId)
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
      const opt = availableMonths.find((m) => m.key === mKey)
      if (opt) {
        setDateFrom(opt.startDate)
        setDateTo(opt.endDate)
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
    setStatus('')
  }

  // Fetch Report Data
  const loadReports = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (platformId) params.set('platform_id', platformId)
      if (pillarId) params.set('pillar_id', pillarId)
      if (status) params.set('status', status)

      const res = await apiFetch(`/api/reports?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.rows || [])
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, platformId, pillarId, status])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  // Compute summary metrics for filtered rows
  const summaryMetrics = useMemo(() => {
    const total = rows.length
    const published = rows.filter((r) => r.status === 'PUBLISHED').length
    const inProgress = rows.filter((r) =>
      ['APPROVED', 'PRODUCTION', 'PENDING_PRODUCTION_REVIEW', 'READY_TO_PUBLISH'].includes(r.status)
    ).length
    const draftReview = rows.filter((r) =>
      ['DRAFT', 'PENDING_REVIEW'].includes(r.status)
    ).length
    const publishedPercent = total > 0 ? Math.round((published / total) * 100) : 0

    return { total, published, inProgress, draftReview, publishedPercent }
  }, [rows])

  // Dynamic label for current period selection
  const currentPeriodLabel = useMemo(() => {
    if (selectedPeriodId === 'ALL') {
      if (dateFrom && dateTo) {
        return `Kustom (${formatDate(dateFrom)} – ${formatDate(dateTo)})`
      }
      return 'Semua Periode'
    }

    if (currentPeriod) {
      if (selectedMonthKey !== 'ALL') {
        const m = availableMonths.find((item) => item.key === selectedMonthKey)
        return `${currentPeriod.name} — Bulan ${m?.name || selectedMonthKey}`
      }
      return `${currentPeriod.name} (${formatDate(currentPeriod.start_date)} – ${formatDate(currentPeriod.end_date)})`
    }

    return 'Laporan Konten'
  }, [selectedPeriodId, currentPeriod, selectedMonthKey, availableMonths, dateFrom, dateTo])

  // Export to Excel with PLN Theme
  const handleExportExcel = async () => {
    if (rows.length === 0) return
    setExportingExcel(true)
    try {
      const platformObj = masterData.platforms.find((p) => p.id === platformId)
      const pillarObj = masterData.pillars.find((p) => p.id === pillarId)
      const monthObj = availableMonths.find((m) => m.key === selectedMonthKey)

      await exportContentReportToExcel(rows, {
        periodLabel: currentPeriodLabel,
        semesterName: currentPeriod?.name,
        monthName: monthObj?.name,
        dateFrom,
        dateTo,
        platformName: platformObj?.name,
        pillarName: pillarObj?.name,
        statusName: status ? CONTENT_STATUS_LABELS[status] || status : undefined,
      })
    } catch (err) {
      console.error('Excel export error:', err)
    } finally {
      setExportingExcel(false)
    }
  }

  // Export to CSV
  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (platformId) params.set('platform_id', platformId)
      if (pillarId) params.set('pillar_id', pillarId)
      if (status) params.set('status', status)
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
      a.download = `Laporan_Konten_PLN_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV export error:', err)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#00A2B9]" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Laporan Berkala
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Ekspor dan analisis data perencanaan serta performa konten media sosial PLN UID Jawa Barat.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={loading || rows.length === 0}
            className="text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            Ekspor CSV
          </Button>

          <Button
            onClick={handleExportExcel}
            disabled={loading || rows.length === 0 || exportingExcel}
            className="bg-[#00A2B9] hover:bg-[#008c9f] text-white text-xs font-semibold shadow-sm transition-colors"
          >
            {exportingExcel ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Menyiapkan Excel...
              </>
            ) : (
              <>
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                Ekspor Excel (.xlsx)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {/* Card 1: Total */}
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 shadow-sm dark:border-sky-950/40 dark:bg-sky-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Total Konten</p>
            <FileBarChart className="h-4 w-4 text-[#00A2B9]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {summaryMetrics.total}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Sesuai filter periode aktif
          </p>
        </div>

        {/* Card 2: Published */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-950/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Dipublikasikan</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {summaryMetrics.published}
            </p>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
              {summaryMetrics.publishedPercent}%
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
            Realisasi publikasi
          </p>
        </div>

        {/* Card 3: In Production / Ready */}
        <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-4 shadow-sm dark:border-cyan-950/40 dark:bg-cyan-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-cyan-800 dark:text-cyan-300">Produksi & Siap</p>
            <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-cyan-800 dark:text-cyan-300">
            {summaryMetrics.inProgress}
          </p>
          <p className="mt-0.5 text-[11px] text-cyan-600/80 dark:text-cyan-400/80">
            Dalam tahap pengerjaan
          </p>
        </div>

        {/* Card 4: Draft / Review */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm dark:border-amber-950/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Draft & Review</p>
            <FileEdit className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-800 dark:text-amber-300">
            {summaryMetrics.draftReview}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-600/80 dark:text-amber-400/80">
            Konsep belum disetujui
          </p>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <Card className="border-slate-200/80 shadow-sm dark:border-slate-800">
        <CardContent className="p-4 space-y-3.5">
          {/* Header Filter */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Filter className="h-3.5 w-3.5 text-[#00A2B9]" />
              <span>Filter Periode Semester & Kriteria Laporan</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Reset Filter
            </Button>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {/* 1. Periode / Semester */}
            <div className="space-y-1">
              <label htmlFor="report-period" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Periode Semester
              </label>
              <Select
                id="report-period"
                value={selectedPeriodId}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="text-xs font-medium"
              >
                <option value="ALL">Semua Periode</option>
                {allPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* 2. Bulan (Turunan dari Semester) */}
            <div className="space-y-1">
              <label htmlFor="report-month" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Pilih Bulan
              </label>
              <Select
                id="report-month"
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

            {/* 3. Platform */}
            <div className="space-y-1">
              <label htmlFor="report-platform" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Platform Media
              </label>
              <Select
                id="report-platform"
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
                className="text-xs"
              >
                <option value="">Semua Platform</option>
                {masterData.platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* 6. Content Pillar */}
            <div className="space-y-1">
              <label htmlFor="report-pillar" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Content Pillar
              </label>
              <Select
                id="report-pillar"
                value={pillarId}
                onChange={(e) => setPillarId(e.target.value)}
                className="text-xs"
              >
                <option value="">Semua Pillar</option>
                {masterData.pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* 7. Status Konten */}
            <div className="space-y-1">
              <label htmlFor="report-status" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                Status Konten
              </label>
              <Select
                id="report-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-xs font-medium"
              >
                <option value="">Semua Status Konten</option>
                <option value="PUBLISHED">Semua Konten Dipublikasikan (PUBLISHED)</option>
                <option value="DRAFT">Draft Konsep</option>
                <option value="PENDING_REVIEW">Menunggu Review Konsep</option>
                <option value="APPROVED">Konsep Disetujui</option>
                <option value="PRODUCTION">Dalam Produksi</option>
                <option value="READY_TO_PUBLISH">Siap Publikasi</option>
                <option value="REJECTED">Ditolak / Dibatalkan</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Table Card */}
      <Card className="border-slate-200/80 shadow-sm dark:border-slate-800">
        <CardHeader className="border-b border-slate-100 py-3.5 px-5 dark:border-slate-800">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <FileBarChart className="h-4 w-4 text-[#00A2B9]" />
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                Daftar Konten — {currentPeriodLabel}
              </CardTitle>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {loading ? 'Memuat data...' : `${rows.length} konten ditemukan`}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#00A2B9]" />
              <p className="text-xs font-medium text-slate-500">Memuat laporan konten...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Calendar className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                Tidak ada data konten
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                Tidak ada konten yang sesuai dengan filter periode atau kriteria yang dipilih.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-3 py-3 text-center font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-12">
                      No.
                    </th>
                    <th className="px-3 py-3 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      Tanggal Terbit
                    </th>
                    <th className="px-3 py-3 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-[200px]">
                      Judul Konten & Tema
                    </th>
                    <th className="px-3 py-3 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Content Pillar
                    </th>
                    <th className="px-3 py-3 text-left font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Format
                    </th>
                    <th className="px-3 py-3 text-center font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Status
                    </th>
                    {masterData.platforms.map((plat) => (
                      <Fragment key={plat.id}>
                        <th
                          className="px-3 py-3 text-left font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 min-w-[200px]"
                        >
                          {plat.name} (Tautan & Insight)
                        </th>
                        <th
                          className="px-3 py-3 text-center font-semibold uppercase tracking-wider text-teal-800 dark:text-teal-300 min-w-[100px] whitespace-nowrap"
                        >
                          ER% {plat.name}
                        </th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((row, index) => (
                    <tr
                      key={row.id || index}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-3 py-3 font-medium text-slate-400 text-center">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        {row.planned_date ? formatDate(row.planned_date) : '-'}
                      </td>
                      <td className="px-3 py-3 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                          {row.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {row.topic}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {row.pillar ? (
                          <span className="inline-block rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {row.pillar}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                        {row.format || '-'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status="PUBLISHED" />
                      </td>

                      {masterData.platforms.map((plat) => {
                        const pm = row.platform_publications?.[plat.name]
                        const reach = pm?.reach || 0
                        const views = pm?.views || 0
                        const likes = pm?.likes || 0
                        const comments = pm?.comments || 0
                        const saves = pm?.saves || 0
                        const shares = pm?.shares || 0
                        const totalInteractions = likes + comments + saves + shares
                        const denominator = reach > 0 ? reach : views
                        const er = denominator > 0 ? (totalInteractions / denominator) * 100 : 0
                        const hasMetrics = reach > 0 || views > 0 || likes > 0 || comments > 0 || saves > 0 || shares > 0

                        return (
                          <Fragment key={plat.id}>
                            <td className="px-3 py-3 text-xs space-y-1 min-w-[180px]">
                              {pm?.url ? (
                                <a
                                  href={pm.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[#00A2B9] hover:underline font-mono text-[11px] truncate max-w-[170px]"
                                >
                                  Tautan {plat.name}
                                </a>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">-</span>
                              )}

                              {hasMetrics && (
                                <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-700 dark:text-slate-300 mt-1">
                                  {reach > 0 && (
                                    <span className="inline-block bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 font-mono">
                                      Reach: {reach.toLocaleString()}
                                    </span>
                                  )}
                                  {views > 0 && (
                                    <span className="inline-block bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-mono">
                                      Views: {views.toLocaleString()}
                                    </span>
                                  )}
                                  {likes > 0 && (
                                    <span className="inline-block bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800 font-mono">
                                      Likes: {likes.toLocaleString()}
                                    </span>
                                  )}
                                  {comments > 0 && (
                                    <span className="inline-block bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-mono">
                                      Komen: {comments.toLocaleString()}
                                    </span>
                                  )}
                                  {saves > 0 && (
                                    <span className="inline-block bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-mono">
                                      Saves: {saves.toLocaleString()}
                                    </span>
                                  )}
                                  {shares > 0 && (
                                    <span className="inline-block bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 font-mono">
                                      Shares: {shares.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="px-3 py-3 text-xs text-center font-mono min-w-[100px]">
                              {hasMetrics ? (
                                <span className="inline-block bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 px-2 py-1 rounded-md border border-teal-300 dark:border-teal-700 font-bold text-xs">
                                  {er.toFixed(2)}%
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">-</span>
                              )}
                            </td>
                          </Fragment>
                        )
                      })}
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
