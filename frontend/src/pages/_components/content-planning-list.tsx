'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Search,
  Eye,
  Edit,
  FileText,
  Loader2,
  Lock,
  MoreVertical,
  BookmarkPlus,
  Trash2,
  Copy,
  ExternalLink,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  BookmarkCheck,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import Link from '@/compat/next'
import { formatDateWithDay, getWeekOfMonth } from '@/lib/utils'
import { SkeletonTable } from '@/components/ui/skeleton'
import type { Content, Publication, PlanningPeriod } from '@/types'
import { PlatformCluster } from '@/components/ui/platform-icon'
import { ContentPlanningKpi } from './content-planning-kpi'
import { ContentPlanningCharts } from './content-planning-charts'
import { useTopics } from '@/lib/use-topics'

/** Ambil URL publikasi pertama yang published (kalau ada) */
function getPublishedUrl(content: Content): string | null {
  if (!content.publications || content.publications.length === 0) return null
  const published = content.publications.find(
    (p: Publication) => p.status === 'PUBLISHED' && p.url
  )
  return published?.url || null
}

const TH_BASE =
  'whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary'

const MONTH_NAMES = [
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
]

export default function ContentPlanningList() {
  const topics = useTopics()
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [pillarFilter, setPillarFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('DESC')
  const [specialFilter, setSpecialFilter] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Action Menu Popover
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [masterData, setMasterData] = useState<{
    pillars: Array<{ id: string; name: string }>
    platforms: Array<{ id: string; name: string }>
  }>({ pillars: [], platforms: [] })
  const [planningPeriods, setPlanningPeriods] = useState<PlanningPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')

  // Hitung daftar tahun yang tersedia dari data konten dan periode
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>()
    const currentYear = new Date().getFullYear()
    yearsSet.add(currentYear)
    yearsSet.add(currentYear - 1)
    yearsSet.add(currentYear + 1)

    contents.forEach((c) => {
      if (c.planned_date) {
        const y = new Date(c.planned_date).getFullYear()
        if (!isNaN(y)) yearsSet.add(y)
      }
      if (c.created_at) {
        const y = new Date(c.created_at).getFullYear()
        if (!isNaN(y)) yearsSet.add(y)
      }
    })

    planningPeriods.forEach((p) => {
      if (p.start_date) {
        const y = new Date(p.start_date).getFullYear()
        if (!isNaN(y)) yearsSet.add(y)
      }
      if (p.end_date) {
        const y = new Date(p.end_date).getFullYear()
        if (!isNaN(y)) yearsSet.add(y)
      }
    })

    return Array.from(yearsSet).sort((a, b) => b - a)
  }, [contents, planningPeriods])

  // Handler pergantian filter Bulan & Tahun
  const handleDateFilterChange = (newMonth: string, newYear: string) => {
    let finalMonth = newMonth
    let finalYear = newYear

    // Jika user mengosongkan tahun saat bulan masih terisi, kosongkan keduanya
    if (!newYear && yearFilter && newMonth) {
      finalMonth = ''
      finalYear = ''
    } else if (newMonth && !newYear) {
      // Jika user memilih bulan pertama kali tanpa tahun, otomatis pilih tahun aktif
      finalYear = new Date().getFullYear().toString()
    }

    setMonthFilter(finalMonth)
    setYearFilter(finalYear)
    setSelectedPeriodId('') // Reset dropdown semester agar tidak bentrok

    if (finalYear && finalMonth) {
      const m = parseInt(finalMonth, 10)
      const y = parseInt(finalYear, 10)
      const lastDay = new Date(y, m, 0).getDate()
      const start = `${y}-${String(m).padStart(2, '0')}-01`
      const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      setDateFrom(start)
      setDateTo(end)
    } else if (finalYear && !finalMonth) {
      const y = parseInt(finalYear, 10)
      setDateFrom(`${y}-01-01`)
      setDateTo(`${y}-12-31`)
    } else {
      setDateFrom('')
      setDateTo('')
    }
  }

  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMasterData()
  }, [])

  useEffect(() => {
    loadContents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, topicFilter, pillarFilter, platformFilter, dateFrom, dateTo, sortBy, sortOrder])

  // Reset current page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, topicFilter, pillarFilter, platformFilter, dateFrom, dateTo, sortBy, sortOrder, specialFilter])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadMasterData() {
    try {
      const [res, pRes] = await Promise.all([
        apiFetch('/api/master-data'),
        apiFetch('/api/planning-periods'),
      ])
      if (res.ok) {
        const data = await res.json()
        setMasterData({
          pillars: data.pillars || [],
          platforms: data.platforms || [],
        })
      }
      if (pRes.ok) {
        const pData = await pRes.json()
        setPlanningPeriods(pData.periods || [])
      }
    } catch (error) {
      console.error('Failed to load master data:', error)
    }
  }

  async function loadContents() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (topicFilter) params.set('topic', topicFilter)
      if (pillarFilter) params.set('pillar_id', pillarFilter)
      if (platformFilter) params.set('platform_id', platformFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (sortBy) params.set('sort_by', sortBy)
      if (sortOrder) params.set('order', sortOrder)

      const res = await apiFetch(`/api/contents?${params.toString()}`)
      const data = await res.json()
      setContents(data.contents || [])
    } catch (error) {
      console.error('Failed to load contents:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleResetFilters() {
    setSearch('')
    setStatusFilter('')
    setTopicFilter('')
    setPillarFilter('')
    setPlatformFilter('')
    setMonthFilter('')
    setYearFilter('')
    setDateFrom('')
    setDateTo('')
    setSelectedPeriodId('')
    setSortBy('created_at')
    setSortOrder('DESC')
    setSpecialFilter(null)
    setCurrentPage(1)
  }

  // Real-time instant filtering & sorting
  const filteredContents = useMemo(() => {
    let list = [...contents]

    // 0. Special KPI Filter (Perlu Tindak Lanjut / Terlambat)
    if (specialFilter === 'follow_up') {
      const todayStr = new Date().toISOString().split('T')[0]
      list = list.filter((c) => {
        if (['REVISION_REQUIRED', 'RESCHEDULED', 'NOT_REALIZED'].includes(c.status)) {
          return true
        }
        if (c.planned_date && c.planned_date < todayStr && c.status !== 'PUBLISHED') {
          return true
        }
        return false
      })
    } else if (specialFilter === 'overdue') {
      const todayStr = new Date().toISOString().split('T')[0]
      list = list.filter((c) => c.planned_date && c.planned_date < todayStr && c.status !== 'PUBLISHED')
    }

    // 1. Search (Title, Topic, Pillar)
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter((item) => {
        const matchTitle = item.title?.toLowerCase().includes(q)
        const matchTopic = item.topic?.toLowerCase().includes(q)
        const matchPillar = item.pillar?.name?.toLowerCase().includes(q)
        return matchTitle || matchTopic || matchPillar
      })
    }

    // 2. Status
    if (statusFilter) {
      list = list.filter((item) => item.status === statusFilter)
    }

    // 3. Topik Konten
    if (topicFilter) {
      const cleanTopic = topicFilter.includes(' - ')
        ? topicFilter.split(' - ')[1].toLowerCase().trim()
        : topicFilter.toLowerCase().trim()
      list = list.filter(
        (item) =>
          item.topic === topicFilter ||
          (item.topic && item.topic.toLowerCase().includes(cleanTopic))
      )
    }

    // 3.5. Pillar
    if (pillarFilter) {
      list = list.filter(
        (item) =>
          item.pillar_id === pillarFilter ||
          item.pillar?.id === pillarFilter ||
          item.pillar?.name?.toLowerCase() === pillarFilter.toLowerCase()
      )
    }

    // 4. Platform
    if (platformFilter) {
      list = list.filter(
        (item) =>
          item.platform_id === platformFilter ||
          item.platform?.id === platformFilter ||
          item.platform_ids?.includes(platformFilter)
      )
    }

    // 5. Date Range (dari Filter Bulan & Tahun atau Periode)
    if (dateFrom) {
      const fromStr = dateFrom.slice(0, 10)
      list = list.filter((item) => {
        if (!item.planned_date) return false
        return item.planned_date.slice(0, 10) >= fromStr
      })
    }
    if (dateTo) {
      const toStr = dateTo.slice(0, 10)
      list = list.filter((item) => {
        if (!item.planned_date) return false
        return item.planned_date.slice(0, 10) <= toStr
      })
    }

    // 6. Sorting
    list.sort((a, b) => {
      if (sortBy === 'created_at') {
        const timeA = new Date(a.created_at || 0).getTime()
        const timeB = new Date(b.created_at || 0).getTime()
        return sortOrder === 'ASC' ? timeA - timeB : timeB - timeA
      }
      // default: planned_date
      const dateA = a.planned_date ? new Date(a.planned_date).getTime() : 0
      const dateB = b.planned_date ? new Date(b.planned_date).getTime() : 0
      if (!dateA && !dateB) return 0
      if (!dateA) return 1
      if (!dateB) return -1
      return sortOrder === 'DESC' ? dateB - dateA : dateA - dateB
    })

    return list
  }, [contents, search, statusFilter, pillarFilter, platformFilter, dateFrom, dateTo, sortBy, sortOrder, specialFilter])

  // Pagination calculation
  const totalItems = filteredContents.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const paginatedContents = filteredContents.slice(startIndex, endIndex)

  const [tabunganTarget, setTabunganTarget] = useState<Content | null>(null)
  const [tabunganReason, setTabunganReason] = useState('')
  const [tabunganLoading, setTabunganLoading] = useState(false)
  const [tabunganError, setTabunganError] = useState<string | null>(null)

  function openMoveToTabungan(content: Content) {
    setActiveMenuId(null)
    setTabunganTarget(content)
    setTabunganReason('')
    setTabunganError(null)
  }

  async function handleConfirmMoveToTabungan() {
    if (!tabunganTarget) return
    setTabunganLoading(true)
    setTabunganError(null)

    try {
      const res = await apiFetch(`/api/tabungan/${tabunganTarget.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: tabunganReason.trim() || 'Dipindahkan dari Rencana Konten ke Bank Konten' }),
      })
      if (res.ok) {
        setTabunganTarget(null)
        loadContents()
      } else {
        const d = await res.json()
        setTabunganError(d.error || 'Gagal memindahkan ke Bank Konten')
      }
    } catch (e) {
      console.error(e)
      setTabunganError('Terjadi kesalahan saat memindahkan ke Bank Konten')
    } finally {
      setTabunganLoading(false)
    }
  }

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<Content | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openDeleteModal(content: Content) {
    setActiveMenuId(null)
    const isLocked = ['PENDING_REVIEW', 'APPROVED', 'PUBLISHED'].includes(content.status)
    if (isLocked) {
      setDeleteError(
        `Konten dengan status "${content.status}" sedang aktif dalam alur workflow dan tidak dapat dihapus.`
      )
    } else {
      setDeleteError(null)
    }
    setDeleteTarget(content)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError(null)

    try {
      const res = await apiFetch(`/api/contents/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteTarget(null)
        loadContents()
      } else {
        const d = await res.json()
        setDeleteError(d.error || 'Gagal menghapus rencana konten.')
      }
    } catch (e) {
      console.error(e)
      setDeleteError('Terjadi kesalahan jaringan saat menghapus konten.')
    } finally {
      setDeleteLoading(false)
    }
  }

  function handleCopyLink(contentId: string) {
    const url = `${window.location.origin}/content/${contentId}`
    navigator.clipboard.writeText(url)
    setCopiedId(contentId)
    setTimeout(() => {
      setCopiedId(null)
      setActiveMenuId(null)
    }, 1200)
  }

  const hasFilters =
    Boolean(search) ||
    Boolean(statusFilter) ||
    Boolean(topicFilter) ||
    Boolean(pillarFilter) ||
    Boolean(platformFilter) ||
    Boolean(selectedPeriodId) ||
    Boolean(monthFilter) ||
    Boolean(yearFilter) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(specialFilter) ||
    sortBy !== 'created_at' ||
    sortOrder !== 'DESC'

  return (
    <div className="space-y-6">
      {/* 1. SEKSI 4 KARTU RINGKASAN KPI */}
      <ContentPlanningKpi
        contents={contents}
        activeStatusFilter={statusFilter}
        activeSpecialFilter={specialFilter}
        onFilterStatus={(st) => {
          setStatusFilter(st)
          setSpecialFilter(null)
        }}
        onFilterSpecial={(spec) => {
          setSpecialFilter(spec)
          if (spec) setStatusFilter('')
        }}
      />

      {/* 2. SEKSI 2 CHART UTAMA & ACCORDION RINGKASAN LAINNYA */}
      <ContentPlanningCharts
        contents={filteredContents}
        activeStatusFilter={statusFilter}
        activeSpecialFilter={specialFilter}
        activePillarFilter={pillarFilter}
        activePlatformFilter={platformFilter}
        onFilterStatus={(st) => {
          setStatusFilter(st)
          setSpecialFilter(null)
        }}
        onFilterSpecial={(spec) => {
          setSpecialFilter(spec)
          if (spec) setStatusFilter('')
        }}
        onFilterPillar={(pid) => setPillarFilter(pid)}
        onFilterPlatform={(platId) => setPlatformFilter(platId)}
        pillars={masterData.pillars}
        platforms={masterData.platforms}
      />

      {/* 3. SEKSI FILTER & PENCARIAN 2 BARIS */}
      <Card className="shadow-xs border-border">
        <div className="p-4 space-y-3">
          {/* BARIS 1: Pencarian berdasarkan judul, topik, atau pilar */}
          <div className="relative w-full">
            <Search
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <Input
              placeholder="Pencarian berdasarkan judul, topik, atau pilar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10 w-full bg-white dark:bg-slate-900"
              aria-label="Cari konten berdasarkan judul, topik, atau pilar"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted hover:text-ink p-1"
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>

          {/* BARIS 2: [Status] [Topik] [Platform] [Periode] [Rentang Tanggal] [Sort] — satu baris di desktop.
              Rentang tanggal dapat 2fr karena berisi dua date input. */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-[1fr_1fr_1fr_1fr_2fr_1fr] items-center">
            {/* 1. Status */}
            <div>
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setSpecialFilter(null)
                }}
                className="w-full text-xs bg-white dark:bg-slate-900"
                aria-label="Filter status"
              >
                <option value="">Semua Status</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_REVIEW">Menunggu Persetujuan Konsep</option>
                <option value="APPROVED">Konsep Disetujui</option>
                <option value="PRODUCTION">Produksi Konten</option>
                <option value="PENDING_PRODUCTION_REVIEW">Menunggu Review Produksi</option>
                <option value="READY_TO_PUBLISH">Siap Publikasi</option>
                <option value="PUBLISHED">Dipublikasikan</option>
                <option value="REJECTED">Ditolak</option>
                <option value="RESCHEDULED">Dijadwalkan Ulang</option>
                <option value="NOT_REALIZED">Tidak Direalisasikan</option>
              </Select>
            </div>

            {/* 2. Topik Konten */}
            <div>
              <Select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-900"
                aria-label="Filter topik konten"
              >
                <option value="">Semua Topik Konten</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>

            {/* 3. Platform */}
            <div>
              <Select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-900"
                aria-label="Filter platform"
              >
                <option value="">Semua Platform</option>
                {masterData.platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* 3.5. Periode Perencanaan (Semester) */}
            <div>
              <Select
                value={selectedPeriodId}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedPeriodId(val)
                  setMonthFilter('')
                  setYearFilter('')
                  const p = planningPeriods.find((item) => item.id === val)
                  if (p) {
                    setDateFrom(p.start_date)
                    setDateTo(p.end_date)
                  } else {
                    setDateFrom('')
                    setDateTo('')
                  }
                }}
                className="w-full text-xs bg-white dark:bg-slate-900 font-medium"
                aria-label="Filter Periode Perencanaan"
              >
                <option value="">Semua Periode</option>
                {planningPeriods.map((pp) => (
                  <option key={pp.id} value={pp.id}>
                    {pp.name} ({pp.status})
                  </option>
                ))}
              </Select>
            </div>

            {/* 4. Filter Bulan & Tahun */}
            <div className="flex items-center gap-1.5 w-full min-w-0">
              <div className="relative flex-1 min-w-0">
                <Select
                  value={monthFilter}
                  onChange={(e) => handleDateFilterChange(e.target.value, yearFilter)}
                  className="w-full text-xs bg-white dark:bg-slate-900 font-medium"
                  aria-label="Filter Bulan"
                >
                  <option value="">Semua Bulan</option>
                  {MONTH_NAMES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="relative flex-1 min-w-0">
                <Select
                  value={yearFilter}
                  onChange={(e) => handleDateFilterChange(monthFilter, e.target.value)}
                  className="w-full text-xs bg-white dark:bg-slate-900 font-medium"
                  aria-label="Filter Tahun"
                >
                  <option value="">Semua Tahun</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr.toString()}>
                      {yr}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* 5. Sort By (Sesuai Planning Konten / Tanggal Dibuat) */}
            <div>
              <Select
                value={`${sortBy}_${sortOrder.toLowerCase()}`}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'created_at_desc') {
                    setSortBy('created_at')
                    setSortOrder('DESC')
                  } else if (val === 'created_at_asc') {
                    setSortBy('created_at')
                    setSortOrder('ASC')
                  } else if (val === 'planned_date_desc') {
                    setSortBy('planned_date')
                    setSortOrder('DESC')
                  } else {
                    setSortBy('planned_date')
                    setSortOrder('ASC')
                  }
                }}
                className="w-full text-xs bg-white dark:bg-slate-900 font-medium"
                aria-label="Urutkan Konten"
              >
                <option value="created_at_desc">Sort: Tanggal Dibuat (Terbaru)</option>
                <option value="created_at_asc">Sort: Tanggal Dibuat (Terlama)</option>
                <option value="planned_date_asc">Sort: Planning Konten (Terdekat)</option>
                <option value="planned_date_desc">Sort: Planning Konten (Terjauh)</option>
              </Select>
            </div>
          </div>

          {/* Tombol Reset Filter jika ada filter aktif */}
          {hasFilters && (
            <div className="flex items-center justify-between pt-1 border-t border-dashed border-border text-xs">
              <span className="text-ink-muted">
                Filter aktif diterapkan • Ditemukan <strong>{filteredContents.length}</strong> dari {contents.length} konten
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="font-medium text-primary hover:underline hover:text-primary/80"
              >
                Reset Semua Filter
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* 4. SEKSI TABEL DATA RENCANA KONTEN */}
      {loading ? (
        <Card>
          <div
            className="flex items-center justify-center border-b border-border py-3"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin text-ink-muted" aria-hidden="true" />
            <span className="ml-2 text-sm text-ink-secondary">
              Memuat daftar rencana konten...
            </span>
          </div>
          <div className="p-4">
            <SkeletonTable rows={6} cols={7} />
          </div>
        </Card>
      ) : filteredContents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Tidak ada rencana konten"
          description={
            hasFilters
              ? 'Coba sesuaikan kata kunci pencarian atau filter yang dipilih.'
              : 'Mulai susun rencana konten pertama Anda.'
          }
          actionLabel={hasFilters ? 'Reset Filter' : 'Buat Rencana Konten'}
          actionHref={hasFilters ? undefined : '/content/planning/new'}
          actionOnClick={hasFilters ? handleResetFilters : undefined}
        />
      ) : (
        <Card className="shadow-xs border-border">
          <div className="overflow-x-auto min-h-[360px]">
            <table className="w-full">
              <caption className="sr-only">
                Daftar rencana konten Bagian Komunikasi PLN UID Jawa Barat
              </caption>
              <thead className="border-b border-border bg-surface-muted/50">
                <tr>
                  <th scope="col" className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary w-28`}>
                    Minggu
                  </th>
                  <th scope="col" className={TH_BASE}>
                    Hari &amp; Tgl Rencana
                  </th>
                  <th scope="col" className={TH_BASE}>
                    Platform
                  </th>
                  <th scope="col" className={`${TH_BASE} min-w-[220px]`}>
                    Judul Konten
                  </th>
                  <th scope="col" className={TH_BASE}>
                    Topik
                  </th>
                  <th scope="col" className={TH_BASE}>
                    Status
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-ink-secondary w-16"
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedContents.map((content) => {
                  const isLocked = ['PENDING_REVIEW', 'APPROVED', 'PUBLISHED'].includes(
                    content.status
                  )

                  // Platform badges
                  const displayPlatforms: string[] = []
                  if (content.platform?.name) {
                    displayPlatforms.push(content.platform.name)
                  }
                  if (content.platform_ids && content.platform_ids.length > 0) {
                    content.platform_ids.forEach((pid) => {
                      const match = masterData.platforms.find((p) => p.id === pid)
                      if (match && !displayPlatforms.includes(match.name)) {
                        displayPlatforms.push(match.name)
                      }
                    })
                  }

                  // Minggu dalam bulan (misal: "Minggu 1")
                  const weekOfMonthDisplay = content.planned_date
                    ? getWeekOfMonth(content.planned_date)
                    : content.planned_week
                    ? `Minggu ${content.planned_week}`
                    : '-'

                  // Hari & Tanggal Rencana disatukan (misal: "Kamis, 1 Agu 2024")
                  const dateWithDayDisplay = content.planned_date
                    ? formatDateWithDay(content.planned_date)
                    : '-'

                  const isMenuOpen = activeMenuId === content.id

                  return (
                    <tr
                      key={content.id}
                      className="transition-colors hover:bg-surface-muted/60 relative"
                    >
                      {/* 1. MINGGU (Week of Month) */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-ink-secondary">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {weekOfMonthDisplay}
                        </span>
                      </td>

                      {/* 2. HARI & TGL RENCANA (Disatukan) */}
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-ink">
                        {dateWithDayDisplay}
                      </td>

                      {/* 3. PLATFORM */}
                      <td className="px-4 py-3 text-sm">
                        <PlatformCluster platforms={displayPlatforms} size="sm" />
                      </td>

                      {/* 4. JUDUL KONTEN */}
                      <td className="px-4 py-3 text-sm max-w-sm">
                        <div className="space-y-1">
                          {(() => {
                            const pubUrl = getPublishedUrl(content)
                            if (pubUrl) {
                              return (
                                <a
                                  href={pubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-ink hover:text-primary hover:underline line-clamp-2 inline-flex items-center gap-1"
                                >
                                  {content.title}
                                  <ExternalLink className="h-3 w-3 text-primary shrink-0 inline" />
                                </a>
                              )
                            }
                            return (
                              <Link
                                href={`/content/${content.id}`}
                                className="font-medium text-ink hover:text-primary line-clamp-2"
                              >
                                {content.title}
                              </Link>
                            )
                          })()}

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {content.format && (
                              <span className="inline-block text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5">
                                {content.format}
                              </span>
                            )}
                            {content.category?.name && (
                              <span className="inline-block text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded px-1.5 py-0.5">
                                {content.category.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 5. TOPIK */}
                      <td className="px-4 py-3 text-sm max-w-[200px]">
                        <div className="font-medium text-ink line-clamp-1">{content.topic || '-'}</div>
                        {content.pillar?.name && (
                          <div className="mt-0.5">
                            <span className="inline-block text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 rounded px-1.5 py-0.5 line-clamp-1 max-w-fit">
                              {content.pillar.name}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 7. STATUS */}
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <StatusBadge status={content.status} />
                      </td>

                      {/* 8. AKSI (Menu Titik 3 / MoreVertical) */}
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-center relative">
                        <div className="inline-block text-left" ref={isMenuOpen ? menuRef : undefined}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveMenuId(isMenuOpen ? null : content.id)
                            }}
                            className={`h-8 w-8 rounded-lg transition-colors ${
                              isMenuOpen ? 'bg-slate-200 dark:bg-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title="Menu Aksi"
                            aria-label={`Menu aksi ${content.title}`}
                          >
                            <MoreVertical className="h-4 w-4 text-ink-secondary" />
                          </Button>

                          {/* Popover Menu Dropdown Aksi */}
                          {isMenuOpen && (
                            <div className="absolute right-4 top-10 z-50 w-52 rounded-xl border border-border bg-white p-1.5 shadow-lg dark:bg-slate-900 animate-in fade-in-0 zoom-in-95">
                              {/* Opsi 1: Lihat Detail */}
                              <Link
                                href={`/content/${content.id}`}
                                onClick={() => setActiveMenuId(null)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                <span>Lihat Detail</span>
                              </Link>

                              {/* Opsi 2: Edit Rencana Konten */}
                              {isLocked ? (
                                <div
                                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-ink-muted opacity-60 cursor-not-allowed"
                                  title="Konten terkunci dari pengeditan langsung"
                                >
                                  <div className="flex items-center gap-2">
                                    <Edit className="h-3.5 w-3.5" />
                                    <span>Edit Konten</span>
                                  </div>
                                  <Lock className="h-3 w-3 text-amber-500" />
                                </div>
                              ) : (
                                <Link
                                  href={`/content/${content.id}/edit`}
                                  onClick={() => setActiveMenuId(null)}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  <Edit className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                  <span>Edit Konten</span>
                                </Link>
                              )}

                              {/* Opsi 3: Salin Link Konten */}
                              <button
                                type="button"
                                onClick={() => handleCopyLink(content.id)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                {copiedId === content.id ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    <span className="text-emerald-600 font-semibold">Tautan Tersalin!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                    <span>Salin Tautan</span>
                                  </>
                                )}
                              </button>

                              {/* Opsi 4: Pindahkan ke Bank Konten (hanya jika belum published dan belum ditolak) */}
                              {content.status !== 'PUBLISHED' && content.status !== 'REJECTED' && (
                                <button
                                  type="button"
                                  onClick={() => openMoveToTabungan(content)}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  <BookmarkPlus className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                  <span>Pindah ke Bank Konten</span>
                                </button>
                              )}

                              {/* Divider */}
                              <div className="my-1 border-t border-border" />

                              {/* Opsi 5: Hapus Konten */}
                              <button
                                type="button"
                                onClick={() => openDeleteModal(content)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Hapus Konten</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 5. SEKSI PAGINATION & INFORMASI DATA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border text-xs text-ink-secondary bg-surface-muted/20">
            {/* Info jumlah data */}
            <div className="flex items-center gap-2">
              <span>
                Menampilkan <strong className="text-ink">{totalItems > 0 ? startIndex + 1 : 0}</strong> – <strong className="text-ink">{endIndex}</strong> dari <strong className="text-ink">{totalItems}</strong> rencana konten
              </span>
            </div>

            {/* Kontrol Pagination & Page Size */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-ink-muted">Baris:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="rounded border border-border bg-white px-2 py-1 text-xs text-ink dark:bg-slate-900"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  title="Halaman Pertama"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                <span className="px-2 text-xs font-medium text-ink">
                  {currentPage} / {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  title="Halaman Terakhir"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Dialog Pindah ke Bank Konten */}
      <Dialog open={!!tabunganTarget} onOpenChange={(open) => !open && setTabunganTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ink">
              <BookmarkCheck className="h-5 w-5 text-indigo-600" />
              Simpan ke Bank Konten
            </DialogTitle>
            <DialogDescription>
              Pindahkan &quot;{tabunganTarget?.title}&quot; ke daftar Bank Konten. Konten dapat dijadwalkan ulang sewaktu-waktu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="plan-tabungan-reason" className="text-xs font-semibold text-ink">
                Alasan Penyimpanan ke Bank Konten (Opsional)
              </Label>
              <Textarea
                id="plan-tabungan-reason"
                placeholder="Contoh: Menunggu momen kampanye, materi visual perlu disempurnakan..."
                value={tabunganReason}
                onChange={(e) => setTabunganReason(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
            {tabunganError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{tabunganError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTabunganTarget(null)}
              disabled={tabunganLoading}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleConfirmMoveToTabungan}
              disabled={tabunganLoading}
            >
              {tabunganLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan ke Bank Konten'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Konten */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-5 w-5" />
              Hapus Rencana Konten?
            </DialogTitle>
            <DialogDescription>
              Tindakan ini permanen dan tidak dapat dibatalkan. Data rencana konten akan dihapus dari sistem.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60 space-y-1">
                <p className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                  {deleteTarget.title}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  {deleteTarget.topic} • {deleteTarget.pillar?.name || 'Pilar Umum'}
                </p>
                {deleteTarget.planned_date && (
                  <p className="text-[11px] text-slate-400">
                    Rencana Publikasi: {formatDate(deleteTarget.planned_date)}
                  </p>
                )}
              </div>

              {deleteError && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteLoading}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleConfirmDelete}
              disabled={
                deleteLoading ||
                Boolean(
                  deleteTarget &&
                    ['PENDING_REVIEW', 'APPROVED', 'PUBLISHED'].includes(deleteTarget.status)
                )
              }
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus Konten'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
