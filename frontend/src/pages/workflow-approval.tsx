'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from '@/compat/next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2,
  Clock,
  RotateCcw,
  CheckCircle2,
  Search,
  RotateCw,
  MoreVertical,
  Calendar,
  User,
  Eye,
  Check,
  AlertCircle,
  XCircle,
  Inbox,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Layers,
} from 'lucide-react'
import { formatDateWithDay } from '@/lib/utils'
import type { Content, Pillar, Platform, UserRole, ApprovalAction } from '@/types'

type ActiveTab = 'ALL' | 'PENDING' | 'REVISION' | 'APPROVED'

export default function ApprovalPage() {
  const [contents, setContents] = useState<Content[]>([])
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Master data
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [pillarFilter, setPillarFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [picFilter, setPicFilter] = useState('')

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Dropdown action menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Action Dialogs
  const [actionModal, setActionModal] = useState<{
    open: boolean
    content: Content | null
    action: ApprovalAction | null
    title: string
    description: string
    requiresComment: boolean
    submitLabel: string
    variant: 'default' | 'destructive'
  }>({
    open: false,
    content: null,
    action: null,
    title: '',
    description: '',
    requiresComment: false,
    submitLabel: '',
    variant: 'default',
  })
  const [actionComment, setActionComment] = useState('')
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Bulk Approve Dialog
  const [bulkApproveModalOpen, setBulkApproveModalOpen] = useState(false)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load Data
  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // 1. Fetch contents
      const res = await apiFetch('/api/contents?include_savings=false')
      if (res.ok) {
        const data = await res.json()
        setContents(data.contents || [])
      }

      // 2. Fetch master data
      const masterRes = await apiFetch('/api/master-data')
      if (masterRes.ok) {
        const masterData = await masterRes.json()
        setPillars(masterData.pillars || [])
        setPlatforms(masterData.platforms || [])
      }

      // 3. Fetch current user role
      const meRes = await apiFetch('/api/auth/me')
      if (meRes.ok) {
        const meData = await meRes.json()
        setRole(meData?.user?.profile?.role || null)
      }
    } catch (err) {
      console.error('Failed to load approval data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Get unique PIC list for filter
  const picOptions = useMemo(() => {
    const set = new Set<string>()
    contents.forEach((c) => {
      if (c.pic && c.pic.trim()) set.add(c.pic.trim())
    })
    return Array.from(set).sort()
  }, [contents])

  // Metrics Calculation
  const metrics = useMemo(() => {
    const pending = contents.filter(
      (c) => c.status === 'PENDING_REVIEW' || c.status === 'PENDING_PRODUCTION_REVIEW'
    ).length
    const revision = contents.filter((c) => (c.status as string) === 'REVISION_REQUIRED').length
    const approved = contents.filter(
      (c) =>
        c.status === 'APPROVED' ||
        c.status === 'PRODUCTION' ||
        c.status === 'READY_TO_PUBLISH' ||
        c.status === 'PUBLISHED'
    ).length
    const total = contents.filter(
      (c) =>
        c.status === 'PENDING_REVIEW' ||
        c.status === 'PENDING_PRODUCTION_REVIEW' ||
        (c.status as string) === 'REVISION_REQUIRED' ||
        c.status === 'APPROVED'
    ).length

    return { pending, revision, approved, total }
  }, [contents])

  // Filtered List
  const filteredContents = useMemo(() => {
    return contents.filter((c) => {
      // Tab filter
      if (activeTab === 'PENDING') {
        if (c.status !== 'PENDING_REVIEW' && c.status !== 'PENDING_PRODUCTION_REVIEW') return false
      } else if (activeTab === 'REVISION') {
        if ((c.status as string) !== 'REVISION_REQUIRED') return false
      } else if (activeTab === 'APPROVED') {
        if (
          c.status !== 'APPROVED' &&
          c.status !== 'PRODUCTION' &&
          c.status !== 'READY_TO_PUBLISH' &&
          c.status !== 'PUBLISHED'
        )
          return false
      } else {
        // ALL tab: show actionable queue items (pending, revision, approved)
        // If there are pending reviews, prioritize pending + revision + approved
        const relevantStatuses = [
          'PENDING_REVIEW',
          'PENDING_PRODUCTION_REVIEW',
          'REVISION_REQUIRED',
          'APPROVED',
        ]
        if (!relevantStatuses.includes(c.status)) return false
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const titleMatch = c.title?.toLowerCase().includes(query)
        const topicMatch = c.topic?.toLowerCase().includes(query)
        const briefMatch = c.brief?.toLowerCase().includes(query)
        const picMatch = c.pic?.toLowerCase().includes(query)
        if (!titleMatch && !topicMatch && !briefMatch && !picMatch) return false
      }

      // Pillar filter
      if (pillarFilter) {
        if (c.pillar_id !== pillarFilter && c.pillar?.name !== pillarFilter) return false
      }

      // Platform filter
      if (platformFilter) {
        const matchesSingle = c.platform_id === platformFilter || c.platform?.name === platformFilter
        const matchesMulti = c.platforms?.some(
          (p) => p.id === platformFilter || p.name.toLowerCase() === platformFilter.toLowerCase()
        )
        if (!matchesSingle && !matchesMulti) return false
      }

      // PIC filter
      if (picFilter) {
        if (c.pic !== picFilter) return false
      }

      return true
    })
  }, [contents, activeTab, searchQuery, pillarFilter, platformFilter, picFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredContents.length / pageSize))
  const paginatedContents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredContents.slice(start, start + pageSize)
  }, [filteredContents, currentPage, pageSize])

  // Select All Handler
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedContents.map((c) => c.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id))
    }
  }

  // Handle Workflow Action Click
  const openActionDialog = (content: Content, actionType: 'APPROVE' | 'REVISION' | 'REJECT') => {
    setActiveMenuId(null)
    setActionError(null)
    setActionComment('')

    const isConceptReview = content.status === 'PENDING_REVIEW'

    if (actionType === 'APPROVE') {
      const action: ApprovalAction = isConceptReview ? 'APPROVED' : 'PRODUCTION_APPROVED'
      setActionModal({
        open: true,
        content,
        action,
        title: isConceptReview ? 'Setujui Konsep Konten' : 'Setujui Hasil Produksi',
        description: `Apakah Anda yakin ingin menyetujui konten "${content.title}"?`,
        requiresComment: false,
        submitLabel: 'Setujui Konten',
        variant: 'default',
      })
    } else if (actionType === 'REVISION') {
      const action: ApprovalAction = isConceptReview
        ? 'CONCEPT_REVISION_REQUESTED'
        : 'PRODUCTION_REVISION_REQUESTED'
      setActionModal({
        open: true,
        content,
        action,
        title: 'Minta Revisi Konten',
        description: `Tuliskan catatan revisi yang jelas untuk pembuat konten/tim produksi:`,
        requiresComment: true,
        submitLabel: 'Kirim Catatan Revisi',
        variant: 'destructive',
      })
    } else if (actionType === 'REJECT') {
      setActionModal({
        open: true,
        content,
        action: 'REJECTED',
        title: 'Tolak Pengajuan Konten',
        description: `Tuliskan alasan penolakan pengajuan konten "${content.title}":`,
        requiresComment: true,
        submitLabel: 'Tolak Pengajuan',
        variant: 'destructive',
      })
    }
  }

  // Submit Single Action
  const handleActionSubmit = async () => {
    if (!actionModal.content || !actionModal.action) return

    if (actionModal.requiresComment && !actionComment.trim()) {
      setActionError('Catatan atau alasan wajib diisi.')
      return
    }

    setActionSubmitting(true)
    setActionError(null)

    try {
      const payload: { action: ApprovalAction; comment?: string } = {
        action: actionModal.action,
      }
      if (actionComment.trim()) {
        payload.comment = actionComment.trim()
      }

      const res = await apiFetch(`/api/contents/${actionModal.content.id}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setActionError(data.error || 'Gagal memproses aksi persetujuan.')
        return
      }

      setActionModal((prev) => ({ ...prev, open: false }))
      loadData(true)
    } catch {
      setActionError('Terjadi kesalahan jaringan. Silakan coba lagi.')
    } finally {
      setActionSubmitting(false)
    }
  }

  // Bulk Approve Selected
  const handleBulkApproveSubmit = async () => {
    if (selectedIds.length === 0) return
    setBulkSubmitting(true)

    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const content = contents.find((c) => c.id === id)
          if (!content) return
          const action: ApprovalAction =
            content.status === 'PENDING_REVIEW' ? 'APPROVED' : 'PRODUCTION_APPROVED'
          await apiFetch(`/api/contents/${id}/workflow`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          })
        })
      )
      setBulkApproveModalOpen(false)
      setSelectedIds([])
      loadData(true)
    } catch (err) {
      console.error('Bulk approval failed:', err)
    } finally {
      setBulkSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-slate-500">Memuat data persetujuan konten...</p>
      </div>
    )
  }

  const isAllSelected =
    paginatedContents.length > 0 &&
    paginatedContents.every((c) => selectedIds.includes(c.id))

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Persetujuan Konten
            </h1>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Approval Workspace
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review dan kelola konten sebelum masuk ke antrean publikasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && role === 'ADMIN' && (
            <Button
              size="sm"
              onClick={() => setBulkApproveModalOpen(true)}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Check className="mr-1.5 h-4 w-4" />
              Setujui ({selectedIds.length}) Terpilih
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="text-slate-700 dark:text-slate-200"
          >
            <RotateCw
              className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Top 3 KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Menunggu Persetujuan */}
        <Card
          onClick={() => {
            setActiveTab('PENDING')
            setCurrentPage(1)
          }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeTab === 'PENDING'
              ? 'border-amber-400 ring-2 ring-amber-400/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Menunggu Persetujuan
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {metrics.pending}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Perlu Revisi */}
        <Card
          onClick={() => {
            setActiveTab('REVISION')
            setCurrentPage(1)
          }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeTab === 'REVISION'
              ? 'border-rose-400 ring-2 ring-rose-400/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Perlu Revisi
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {metrics.revision}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <RotateCcw className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Disetujui */}
        <Card
          onClick={() => {
            setActiveTab('APPROVED')
            setCurrentPage(1)
          }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeTab === 'APPROVED'
              ? 'border-emerald-400 ring-2 ring-emerald-400/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Disetujui
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {metrics.approved}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            setActiveTab('ALL')
            setCurrentPage(1)
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'ALL'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span>Semua Antrean</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'ALL'
                ? 'bg-primary/10 text-primary'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {metrics.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('PENDING')
            setCurrentPage(1)
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'PENDING'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span>Menunggu Persetujuan</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'PENDING'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {metrics.pending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('REVISION')
            setCurrentPage(1)
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'REVISION'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span>Perlu Revisi</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'REVISION'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {metrics.revision}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('APPROVED')
            setCurrentPage(1)
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'APPROVED'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span>Disetujui</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {metrics.approved}
          </span>
        </button>
      </div>

      {/* Filter Card Container */}
      <Card className="border border-slate-200 shadow-xs dark:border-slate-800">
        <CardContent className="space-y-3 p-4">
          {/* Top Line: Search */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari konten berdasarkan judul, topik, brief narasi, atau PIC..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="h-10 w-full pl-10 text-sm bg-white dark:bg-slate-900"
            />
          </div>

          {/* Bottom Line: 3 Dropdowns + Total count */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Pillar Dropdown */}
              <Select
                value={pillarFilter}
                onChange={(e) => {
                  setPillarFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 w-full text-xs"
              >
                <option value="">Semua Content Pillar</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>

              {/* Platform Dropdown */}
              <Select
                value={platformFilter}
                onChange={(e) => {
                  setPlatformFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 w-full text-xs"
              >
                <option value="">Semua Platform</option>
                {platforms.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </Select>

              {/* PIC Dropdown */}
              <Select
                value={picFilter}
                onChange={(e) => {
                  setPicFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 w-full text-xs"
              >
                <option value="">Semua PIC</option>
                {picOptions.map((pic) => (
                  <option key={pic} value={pic}>
                    {pic}
                  </option>
                ))}
              </Select>
            </div>

            <div className="text-right text-xs font-medium text-slate-500 whitespace-nowrap">
              Menampilkan {filteredContents.length} konten
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th scope="col" className="w-12 px-4 py-3.5 text-center">
                  NO.
                </th>
                <th scope="col" className="w-10 px-2 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-700"
                    aria-label="Select all"
                  />
                </th>
                <th scope="col" className="min-w-[280px] px-4 py-3.5">
                  KONTEN & TOPIK
                </th>
                <th scope="col" className="min-w-[160px] px-4 py-3.5">
                  PILAR & PLATFORM
                </th>
                <th scope="col" className="min-w-[160px] px-4 py-3.5">
                  TGL RENCANA & PIC
                </th>
                <th scope="col" className="min-w-[140px] px-4 py-3.5">
                  STATUS
                </th>
                <th scope="col" className="w-16 px-4 py-3.5 text-right">
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedContents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                        <Inbox className="h-6 w-6" />
                      </div>
                      <p className="mt-3 font-semibold text-slate-700 dark:text-slate-300">
                        Tidak ada antrean konten yang sesuai
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Coba ubah filter pencarian atau tab status di atas.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedContents.map((content, idx) => {
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1
                  const isChecked = selectedIds.includes(content.id)
                  const platformsList =
                    content.platforms && content.platforms.length > 0
                      ? content.platforms.map((p) => p.name).join(' • ')
                      : content.platform?.name || '-'

                  const isPending =
                    content.status === 'PENDING_REVIEW' ||
                    content.status === 'PENDING_PRODUCTION_REVIEW'

                  return (
                    <tr
                      key={content.id}
                      className={`group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                        isChecked ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* NO. */}
                      <td className="px-4 py-4 text-center text-xs font-medium text-slate-400">
                        {rowNumber}
                      </td>

                      {/* Checkbox */}
                      <td className="px-2 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectRow(content.id, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-700"
                          aria-label={`Select ${content.title}`}
                        />
                      </td>

                      {/* KONTEN & TOPIK */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-baseline gap-1.5">
                            <Link
                              href={`/content/${content.id}`}
                              className="font-semibold text-slate-900 hover:text-primary dark:text-white"
                            >
                              {content.title}
                            </Link>
                            {content.topic && (
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                • {content.topic}
                              </span>
                            )}
                          </div>
                          {content.brief && (
                            <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                              {content.brief}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* PILAR & PLATFORM */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {content.pillar?.name || '-'}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            {platformsList}
                          </p>
                        </div>
                      </td>

                      {/* TGL RENCANA & PIC */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{formatDateWithDay(content.planned_date)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <User className="h-3 w-3 text-slate-400" />
                            <span>{content.pic || '-'}</span>
                          </div>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-4">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            Menunggu Persetujuan
                          </span>
                        ) : (content.status as string) === 'REVISION_REQUIRED' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                            <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
                            Perlu Revisi
                          </span>
                        ) : content.status === 'APPROVED' ||
                          content.status === 'READY_TO_PUBLISH' ||
                          content.status === 'PUBLISHED' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            Disetujui
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {content.status}
                          </span>
                        )}
                      </td>

                      {/* AKSI */}
                      <td className="relative px-4 py-4 text-right">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuId(activeMenuId === content.id ? null : content.id)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none dark:hover:bg-slate-800"
                            aria-label="Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {activeMenuId === content.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 z-30 mt-1 w-48 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                            >
                              <Link
                                href={`/content/${content.id}`}
                                className="flex w-full items-center px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60"
                                onClick={() => setActiveMenuId(null)}
                              >
                                <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                Lihat Detail
                              </Link>

                              {role === 'ADMIN' && isPending && (
                                <>
                                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                  <button
                                    type="button"
                                    onClick={() => openActionDialog(content, 'APPROVE')}
                                    className="flex w-full items-center px-4 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                  >
                                    <Check className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                                    Setujui Pengajuan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openActionDialog(content, 'REVISION')}
                                    className="flex w-full items-center px-4 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                  >
                                    <RotateCcw className="mr-2 h-3.5 w-3.5 text-amber-500" />
                                    Minta Revisi
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openActionDialog(content, 'REJECT')}
                                    className="flex w-full items-center px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                  >
                                    <XCircle className="mr-2 h-3.5 w-3.5 text-rose-500" />
                                    Tolak Pengajuan
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Menampilkan{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {filteredContents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {Math.min(currentPage * pageSize, filteredContents.length)}
            </span>{' '}
            dari{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {filteredContents.length}
            </span>{' '}
            pengajuan
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Baris:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-400"
                title="Halaman Pertama"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-400"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-400"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-400"
                title="Halaman Terakhir"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Dialog (Approve / Revision / Reject) */}
      <Dialog
        open={actionModal.open}
        onOpenChange={(open) => setActionModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {actionModal.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {actionModal.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {actionModal.content && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {actionModal.content.title}
                </p>
                <p className="mt-0.5 text-slate-500">
                  Topik: {actionModal.content.topic} • PIC: {actionModal.content.pic || '-'}
                </p>
              </div>
            )}

            {actionModal.requiresComment && (
              <div className="space-y-1.5">
                <Label htmlFor="actionComment" className="text-xs font-semibold">
                  Catatan / Ulasan <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="actionComment"
                  rows={3}
                  placeholder="Berikan catatan perbaikan atau alasan secara rinci..."
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  className="text-xs"
                />
              </div>
            )}

            {actionError && (
              <div className="flex items-center gap-2 rounded-md bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionModal((prev) => ({ ...prev, open: false }))}
              disabled={actionSubmitting}
            >
              Batal
            </Button>
            <Button
              size="sm"
              variant={actionModal.variant}
              onClick={handleActionSubmit}
              disabled={actionSubmitting}
              className={
                actionModal.variant === 'default'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : ''
              }
            >
              {actionSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Memproses...
                </>
              ) : (
                actionModal.submitLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Approve Confirmation Dialog */}
      <Dialog open={bulkApproveModalOpen} onOpenChange={setBulkApproveModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Setujui {selectedIds.length} Konten Sekaligus?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Semua konten yang dipilih akan disetujui dan dilanjutkan ke tahapan alur kerja berikutnya.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkApproveModalOpen(false)}
              disabled={bulkSubmitting}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleBulkApproveSubmit}
              disabled={bulkSubmitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {bulkSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Menyetujui...
                </>
              ) : (
                'Ya, Setujui Semua'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
