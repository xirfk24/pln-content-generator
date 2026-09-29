'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageHeader } from '@/components/ui/page-header'
import { Loader2, CalendarRange, CheckCircle2, AlertCircle, BarChart3, FileBarChart, FileSpreadsheet } from 'lucide-react'
import { formatDate, getPeriodDateRange, type PeriodMode } from '@/lib/utils'
import { exportContentReportToExcel } from '@/lib/excel-export'
import { CONTENT_PILLAR_OPTIONS, isPlatformActive } from '@/constants'
import { useTopics } from '@/lib/use-topics'

// --- Types ---

interface RecapPeriod {
  year: number
  mode: PeriodMode
  period: number
  label: string
  date_from: string
  date_to: string
}

interface RecapSummary {
  planned: number
  published_total: number
  published_verified: number
  published_unverified: number
  realization_rate: number
}

interface PillarBreakdownRow {
  pillar: string
  pillar_code: string
  planned: number
  published: number
  unverified: number
  realization_rate: number
}

interface TopicBreakdownRow {
  topic_code: string
  topic: string
  planned: number
  published: number
  unverified: number
  realization_rate: number
}

interface PlatformBreakdownRow {
  platform: string
  planned: number
  published: number
  verified: number
  unverified: number
  realization_rate: number
}

interface DetailRow {
  id: string
  title: string
  topic: string
  pillar: string | null
  pillar_code: string | null
  platform: string | null
  status: string
  planned_date: string | null
  published_date: string | null
  publish_verified: boolean
}

interface RecapData {
  period: RecapPeriod
  summary: RecapSummary
  pillar_breakdown: PillarBreakdownRow[]
  topic_breakdown?: TopicBreakdownRow[]
  platform_breakdown: PlatformBreakdownRow[]
  detail: DetailRow[]
  total: number
}

// --- Constants ---

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
]

const SEMESTERS = [
  { value: 1, label: 'Semester 1 (Jan – Jun)' },
  { value: 2, label: 'Semester 2 (Jul – Des)' },
]

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

// --- Component ---

export default function RecapPage() {
  const topics = useTopics()
  const [data, setData] = useState<RecapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [year, setYear] = useState(currentYear)
  const [mode, setMode] = useState<PeriodMode>('monthly')
  const [period, setPeriod] = useState(currentMonth)
  const [yearsWithData, setYearsWithData] = useState<Array<{ year: number; count: number }>>([]) 

  const [platformID, setPlatformID] = useState('')
  const [pillarID, setPillarID] = useState('')
  const [topicFilter, setTopicFilter] = useState('')

  const [masterData, setMasterData] = useState<{
    pillars: Array<{ id: string; name: string }>
    platforms: Array<{ id: string; name: string }>
  }>({ pillars: [], platforms: [] })

  // On mount: load available years and smart-default to the year with most content
  useEffect(() => {
    apiFetch('/api/recap/years')
      .then((r) => r.json())
      .then((d) => {
        const years: Array<{ year: number; count: number }> = d.years || []
        setYearsWithData(years)
        if (years.length > 0) {
          // Pick the year with the most content
          const best = years.reduce((a, b) => (b.count > a.count ? b : a))
          setYear(best.year)
        }
      })
      .catch(console.error)
  }, [])

  // Generate year options: union of currentYear±1 and years that have data
  const yearOptions = useMemo(() => {
    const set = new Set<number>()
    for (let y = currentYear + 1; y >= currentYear - 3; y--) set.add(y)
    yearsWithData.forEach((y) => set.add(y.year))
    return Array.from(set).sort((a, b) => b - a)
  }, [yearsWithData])

  const periodRange = useMemo(() => {
    return getPeriodDateRange(year, mode, period)
  }, [year, mode, period])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('year', String(year))
      params.set('mode', mode)
      params.set('period', String(period))
      if (platformID) params.set('platform_id', platformID)
      if (pillarID) params.set('pillar_id', pillarID)
      if (topicFilter) params.set('topic', topicFilter)

      const res = await apiFetch(`/api/recap?${params.toString()}`)
      if (res.ok) {
        const json: RecapData = await res.json()
        setData(json)
      } else {
        const errBody = await res.json().catch(() => ({}))
        setError(errBody.error || 'Failed to load recap')
      }
    } catch (err) {
      console.error(err)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [year, mode, period, platformID, pillarID, topicFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    apiFetch('/api/master-data')
      .then((r) => r.json())
      .then((d) => setMasterData({ pillars: d.pillars || [], platforms: d.platforms || [] }))
      .catch(console.error)
  }, [])

  const [exportingExcel, setExportingExcel] = useState(false)

  async function handleExportExcel() {
    if (!data || !data.detail) return
    setExportingExcel(true)
    try {
      const platformObj = masterData.platforms.find((p) => p.id === platformID)
      const pillarObj = masterData.pillars.find((p) => p.id === pillarID)

      const items = data.detail.map((d) => ({
        id: d.id,
        title: d.title,
        topic: d.topic,
        pillar: d.pillar,
        platform: d.platform,
        status: d.status,
        planned_date: d.planned_date,
      }))

      await exportContentReportToExcel(items, {
        periodLabel: `${data.period.label} (${data.period.date_from} s/d ${data.period.date_to})`,
        platformName: platformObj?.name,
        pillarName: pillarObj?.name,
      })
    } catch (err) {
      console.error('Excel export error:', err)
    } finally {
      setExportingExcel(false)
    }
  }

  function handleModeChange(newMode: PeriodMode) {
    setMode(newMode)
    setPeriod(1) // reset to period 1 on mode change
  }

  // Reset period if out of range when mode changes
  const periodOptions = mode === 'semester' ? SEMESTERS : MONTHS

  return (
    <div className="space-y-6">
      {/* Banner Penjelasan Modul */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-blue-50 p-4 text-xs text-indigo-900 shadow-sm sm:text-sm">
        <p className="font-semibold text-indigo-950">
          📑 Modul Rekapitulasi Konten & Laporan Periode
        </p>
        <p className="mt-1 text-xs text-indigo-700">
          Menyajikan ringkasan realisasi rencana konten per bulan dan semester, rasio ketercapaian publikasi per pilar dan platform, serta fitur ekspor data Excel (.xlsx) untuk pelaporan manajemen.
        </p>
      </div>

      <PageHeader
        title="Rekap Konten"
        description="Rekapitulasi ketercapaian publikasi konten berdasarkan periode bulanan atau semester"
      />

      {/* --- Period Selector --- */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:flex-wrap">
            <div className="flex items-center gap-2 pb-2 text-sm font-medium text-ink-secondary lg:pb-0">
              <CalendarRange className="h-4 w-4" aria-hidden="true" />
              Periode
            </div>

            <div>
              <label htmlFor="recap-year" className="mb-1 block text-xs text-ink-muted">
                Tahun
              </label>
              <Select
                id="recap-year"
                value={String(year)}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full sm:w-32"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>

            <div>
              <label htmlFor="recap-mode" className="mb-1 block text-xs text-ink-muted">
                Mode Periode
              </label>
              <Select
                id="recap-mode"
                value={mode}
                onChange={(e) => handleModeChange(e.target.value as PeriodMode)}
                className="w-full sm:w-36"
              >
                <option value="monthly">Bulanan</option>
                <option value="semester">Semester</option>
              </Select>
            </div>

            <div>
              <label htmlFor="recap-period" className="mb-1 block text-xs text-ink-muted">
                Pilihan Periode
              </label>
              <Select
                id="recap-period"
                value={String(period)}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="w-full sm:w-44"
              >
                {periodOptions.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <label htmlFor="recap-platform" className="mb-1 block text-xs text-ink-muted">
                Platform
              </label>
              <Select
                id="recap-platform"
                value={platformID}
                onChange={(e) => setPlatformID(e.target.value)}
                className="w-full sm:w-40"
              >
                <option value="">Semua Platform</option>
                {masterData.platforms.filter((p) => isPlatformActive(p.name)).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label htmlFor="recap-topic" className="mb-1 block text-xs text-ink-muted">
                Topik Konten
              </label>
              <Select
                id="recap-topic"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="w-full sm:w-48"
              >
                <option value="">Semua Topik</option>
                {topics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>

            <div>
              <label htmlFor="recap-pillar" className="mb-1 block text-xs text-ink-muted">
                Content Pillar
              </label>
              <Select
                id="recap-pillar"
                value={pillarID}
                onChange={(e) => setPillarID(e.target.value)}
                className="w-full sm:w-48"
              >
                <option value="">Semua Content Pillar</option>
                {CONTENT_PILLAR_OPTIONS.map((p) => {
                  const match = masterData.pillars.find(
                    (mp) =>
                      mp.name.toLowerCase() === p.toLowerCase() ||
                      mp.name.toLowerCase().startsWith(p.split(' ')[0].toLowerCase())
                  )
                  const val = match ? match.id : p.split(' ')[0]
                  return (
                    <option key={p} value={val}>
                      {p}
                    </option>
                  )
                })}
              </Select>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2 self-end">
              <Button
                size="sm"
                onClick={handleExportExcel}
                disabled={loading || !data || data.total === 0 || exportingExcel}
                className="bg-[#00A2B9] hover:bg-[#008c9f] text-white text-xs font-semibold shadow-sm"
              >
                {exportingExcel ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Menyiapkan...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                    Ekspor Excel (.xlsx)
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Date range indicator */}
          <div className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-xs text-ink-secondary">
            <span className="font-medium">Rentang Tanggal:</span>{' '}
            <span className="text-ink">{periodRange.label}</span>
            <span className="ml-2 text-ink-muted">
              ({periodRange.dateFrom} s/d {periodRange.dateTo})
            </span>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-danger">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Hint when current period is empty but other years have data */}
      {!loading && data && data.total === 0 && yearsWithData.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning-border bg-warning-soft p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium text-ink">
              Tidak ada konten untuk periode ini.
            </p>
            <p className="mt-1 text-ink-secondary">
              Data konten tersedia di tahun:{' '}
              {yearsWithData.map((y, i) => (
                <button
                  key={y.year}
                  type="button"
                  onClick={() => setYear(y.year)}
                  className="font-semibold text-primary underline hover:no-underline"
                >
                  {y.year} ({y.count} konten){i < yearsWithData.length - 1 ? ', ' : ''}
                </button>
              ))}
            </p>
          </div>
        </div>
      )}

      {loading || !data ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
        </div>
      ) : (
        <>
          {/* --- Summary KPI Cards --- */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              label="Total Rencana"
              value={data.summary.planned}
              icon={<BarChart3 className="h-5 w-5" />}
              color="text-ink-secondary"
            />
            <SummaryCard
              label="Total Terbit"
              value={data.summary.published_total}
              icon={<BarChart3 className="h-5 w-5" />}
              color="text-primary"
            />
            <SummaryCard
              label="Terbit Terverifikasi"
              value={data.summary.published_verified}
              icon={<CheckCircle2 className="h-5 w-5" />}
              color="text-success"
            />
            <SummaryCard
              label="Belum Verifikasi"
              value={data.summary.published_unverified}
              icon={<AlertCircle className="h-5 w-5" />}
              color="text-warning"
            />
            <SummaryCard
              label="Tingkat Realisasi"
              value={`${data.summary.realization_rate.toFixed(1)}%`}
              icon={<BarChart3 className="h-5 w-5" />}
              color={
                data.summary.realization_rate >= 80
                  ? 'text-success'
                  : data.summary.realization_rate >= 50
                    ? 'text-warning'
                    : 'text-danger'
              }
            />
          </div>

          {/* --- Topic Breakdown (Tabel Utama) --- */}
          {(data.topic_breakdown || []).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rekapitulasi per Topik Konten</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-surface-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Kode</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Topik Konten</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Rencana</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Terbit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Belum Verifikasi</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Realisasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.topic_breakdown!.map((row) => (
                        <tr key={row.topic_code + '-' + row.topic} className="hover:bg-surface-muted">
                          <td className="px-4 py-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary-soft text-xs font-bold text-primary">
                              {row.topic_code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-ink">{row.topic}</td>
                          <td className="px-4 py-3 text-right text-sm">{row.planned}</td>
                          <td className="px-4 py-3 text-right text-sm">{row.published}</td>
                          <td className="px-4 py-3 text-right text-sm">{row.unverified}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium">
                            <span
                              className={
                                row.realization_rate >= 80
                                  ? 'text-success'
                                  : row.realization_rate >= 50
                                    ? 'text-warning'
                                    : 'text-danger'
                              }
                            >
                              {row.realization_rate.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* --- Pillar Breakdown --- */}
          {data.pillar_breakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rekapitulasi per Content Pillar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-surface-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Kode</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Content Pillar</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Rencana</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Terbit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Belum Verifikasi</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Realisasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.pillar_breakdown.map((row) => (
                        <tr key={row.pillar} className="hover:bg-surface-muted">
                          <td className="px-4 py-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary-soft text-xs font-bold text-primary">
                              {row.pillar_code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-ink">{row.pillar}</td>
                          <td className="px-4 py-3 text-right text-sm">{row.planned}</td>
                          <td className="px-4 py-3 text-right text-sm">{row.published}</td>
                          <td className="px-4 py-3 text-right text-sm">{row.unverified}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium">
                            <span
                              className={
                                row.realization_rate >= 80
                                  ? 'text-success'
                                  : row.realization_rate >= 50
                                    ? 'text-warning'
                                    : 'text-danger'
                              }
                            >
                              {row.realization_rate.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* --- Platform Breakdown --- */}
          {data.platform_breakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rekapitulasi per Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-surface-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Platform</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Rencana</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Terbit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Terverifikasi</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Belum Verifikasi</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Realisasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.platform_breakdown.map((row) => (
                        <tr key={row.platform} className="hover:bg-surface-muted">
                          <td className="px-4 py-3 text-sm font-medium text-ink">{row.platform}</td>
                          <td className="px-4 py-3 text-right text-sm">{row.planned}</td>
                          <td className="px-4 py-3 text-right text-sm">{row.published}</td>
                          <td className="px-4 py-3 text-right text-sm">{row.verified}</td>
                          <td className="px-4 py-3 text-right text-sm">{row.unverified}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium">
                            <span
                              className={
                                row.realization_rate >= 80
                                  ? 'text-success'
                                  : row.realization_rate >= 50
                                    ? 'text-warning'
                                    : 'text-danger'
                              }
                            >
                              {row.realization_rate.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* --- Detail Table --- */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileBarChart className="h-5 w-5 text-ink-muted" />
                <CardTitle className="text-base">
                  Rincian Konten
                  <span className="ml-2 text-sm font-normal text-ink-secondary">
                    ({data.total} baris)
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {data.detail.length === 0 ? (
                <p className="py-12 text-center text-sm text-ink-muted">
                  Tidak ada data untuk periode ini.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-surface-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Judul & Topik</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Pilar</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Platform</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Tgl Rencana</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Tgl Terbit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Verifikasi</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.detail.map((row) => (
                        <tr key={row.id} className="hover:bg-surface-muted">
                          <td className="px-4 py-3">
                            <div className="font-medium text-ink">{row.title}</div>
                            <div className="text-xs text-ink-secondary">{row.topic}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {row.pillar ? (
                              <Badge variant="outline">
                                {row.pillar_code && `${row.pillar_code} - `}{row.pillar}
                              </Badge>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-ink-secondary">{row.platform || '-'}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                            {formatDate(row.planned_date)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                            {row.published_date ? formatDate(row.published_date) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {row.published_date ? (
                              row.publish_verified ? (
                                <span className="inline-flex items-center gap-1 text-success">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Terverifikasi
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-warning">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  Belum Verifikasi
                                </span>
                              )
                            ) : (
                              <span className="text-ink-muted">-</span>
                            )}
                          </td>
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
        </>
      )}
    </div>
  )
}

// --- Sub-components ---

function SummaryCard({ label, value, icon, color }: {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={color}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
