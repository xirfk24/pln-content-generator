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
  Wrench,
  FileText,
  ExternalLink,
  Send,
} from 'lucide-react'
import { formatDateWithDay } from '@/lib/utils'
import type { Content, Pillar, Platform, UserRole, ApprovalAction } from '@/types'

type ActiveTab = 'CONCEPT' | 'PRODUCTION' | 'ALL' | 'REVISION' | 'APPROVED'

export default function ApprovalPage() {
  const [contents, setContents] = useState<Content[]>([])
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Master data
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])

  // Filters & Tabs (default: ALL / Semua Antrean di paling depan)
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

  // Load Data with created_at DESC as default
  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // 1. Fetch contents ordered by created_at DESC
      const res = await apiFetch('/api/contents?include_savings=false&sort_by=created_at&order=DESC')
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
    const conceptPending = contents.filter((c) => c.status === 'PENDING_REVIEW').length
    const productionPending = contents.filter((c) => c.status === 'PENDING_PRODUCTION_REVIEW').length
    const revision = contents.filter((c) => c.status === 'REVISION_REQUIRED').length
    const approved = contents.filter((c) =>
      ['APPROVED', 'PRODUCTION', 'READY_TO_PUBLISH', 'PUBLISHED'].includes(c.status)
    ).length
    const total = conceptPending + productionPending + revision

    return { conceptPending, productionPending, revision, approved, total }
  }, [contents])

  // Filtered List with created_at DESC sorting
  const filteredContents = useMemo(() => {
    const list = contents.filter((c) => {
      // Tab filter
      if (activeTab === 'CONCEPT') {
        if (c.status !== 'PENDING_REVIEW') return false
      } else if (activeTab === 'PRODUCTION') {
        if (c.status !== 'PENDING_PRODUCTION_REVIEW') return false
      } else if (activeTab === 'REVISION') {
        if (c.status !== 'REVISION_REQUIRED') return false
      } else if (activeTab === 'APPROVED') {
        if (!['APPROVED', 'PRODUCTION', 'READY_TO_PUBLISH', 'PUBLISHED'].includes(c.status)) {
          return false
        }
      } else {
        // ALL tab: show actionable queue items
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

    // Urutkan konten yang baru diajukan di paling atas (created_at DESC)
    return list.sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime()
      const timeB = new Date(b.created_at || 0).getTime()
      return timeB - timeA
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
  const openActionDialog = (
    content: Content,
    actionType: 'APPROVE_CONCEPT' | 'READY_TO_PUBLISH' | 'APPROVE_PRODUCTION' | 'REVISION' | 'REJECT'
  ) => {
    setActiveMenuId(null)
    setActionError(null)
    setActionComment('')

    const isConceptReview = content.status === 'PENDING_REVIEW'

    if (actionType === 'APPROVE_CONCEPT') {
      setActionModal({
        open: true,
        content,
        action: 'APPROVED',
        title: 'Setujui Konsep (Lanjut ke Produksi)',
        description: `Konsep konten "${content.title}" akan disetujui dan dialirkan ke tahap produksi aset visual/media. Lanjutkan?`,
        requiresComment: false,
        submitLabel: 'Setujui Konsep',
        variant: 'default',
      })
    } else if (actionType === 'READY_TO_PUBLISH') {
      setActionModal({
        open: true,
        content,
        action: 'SHORTCUT_READY',
        title: 'Tandai Siap Publikasi',
        description: `Konten "${content.title}" akan langsung disetujui final dan dialihkan ke status Siap Publikasi untuk masuk ke antrean tayang. Lanjutkan?`,
        requiresComment: false,
        submitLabel: 'Siap Publikasi',
        variant: 'default',
      })
    } else if (actionType === 'APPROVE_PRODUCTION') {
      setActionModal({
        open: true,
        content,
        action: 'PRODUCTION_APPROVED',
        title: 'Setujui Hasil Produksi (Siap Publikasi)',
        description: `Hasil produksi konten "${content.title}" telah diverifikasi. Konten akan dialihkan ke status Siap Publikasi. Lanjutkan?`,
        requiresComment: false,
        submitLabel: 'Setujui & Siap Publikasi',
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
        title: isConceptReview ? 'Minta Revisi Konsep' : 'Minta Revisi Hasil Produksi',
        description: `Tuliskan catatan revisi yang jelas untuk pembuat konten agar langsung tampil di modul Tugas Saya:`,
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
            Review berjenjang dan persetujuan naskah konsep serta hasil produksi aset media.
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

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Persetujuan Konsep */}
        <Card
          onClick={() => {
            setActiveTab('CONCEPT')
            setCurrentPage(1)
          }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeTab === 'CONCEPT'
              ? 'border-purple-400 ring-2 ring-purple-400/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Persetujuan Konsep
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {metrics.conceptPending}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Persetujuan Produksi */}
        <Card
          onClick={() => {
            setActiveTab('PRODUCTION')
            setCurrentPage(1)
          }}
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeTab === 'PRODUCTION'
              ? 'border-indigo-400 ring-2 ring-indigo-400/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Persetujuan Produksi
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {metrics.productionPending}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <Wrench className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Perlu Revisi */}
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
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {metrics.revision}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <RotateCcw className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Disetujui */}
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
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {metrics.approved}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Sub-modul Navigasi */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            setActiveTab('ALL')
            setCurrentPage(1)
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'ALL'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
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
            setActiveTab('CONCEPT')
            setCurrentPage(1)
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'CONCEPT'
              ? 'border-purple-600 text-purple-700 font-semibold dark:border-purple-400 dark:text-purple-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Persetujuan Konsep</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'CONCEPT'
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {metrics.conceptPending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('PRODUCTION')
            setCurrentPage(1)
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'PRODUCTION'
              ? 'border-indigo-600 text-indigo-700 font-semibold dark:border-indigo-400 dark:text-indigo-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Wrench className="h-4 w-4" />
          <span>Persetujuan Produksi</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'PRODUCTION'
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {metrics.productionPending}
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
              ? 'border-rose-600 text-rose-700 font-semibold dark:border-rose-400 dark:text-rose-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <RotateCcw className="h-4 w-4" />
          <span>Perlu Revisi</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'REVISION'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
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
              ? 'border-emerald-600 text-emerald-700 font-semibold dark:border-emerald-400 dark:text-emerald-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Riwayat Disetujui</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {metrics.approved}
          </span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari judul, topik, brief, PIC..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pillar Filter */}
          <Select
            value={pillarFilter}
            onChange={(e) => {
              setPillarFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-40 text-xs"
          >
            <option value="">Semua Pilar</option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>

          {/* Platform Filter */}
          <Select
            value={platformFilter}
            onChange={(e) => {
              setPlatformFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-36 text-xs"
          >
            <option value="">Semua Platform</option>
            {platforms.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name}
              </option>
            ))}
          </Select>

          {/* PIC Filter */}
          <Select
            value={picFilter}
            onChange={(e) => {
              setPicFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="w-32 text-xs"
          >
            <option value="">Semua PIC</option>
            {picOptions.map((pic) => (
              <option key={pic} value={pic}>
                {pic}
              </option>
            ))}
          </Select>

          {(searchQuery || pillarFilter || platformFilter || picFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setPillarFilter('')
                setPlatformFilter('')
                setPicFilter('')
                setCurrentPage(1)
              }}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600"
                    aria-label="Select All"
                  />
                </th>
                <th className="min-w-[240px] px-4 py-3">Judul & Detail Konten</th>
                <th className="min-w-[160px] px-4 py-3">Pilar & Platform</th>
                <th className="min-w-[140px] px-4 py-3">Target & PIC</th>
                <th className="min-w-[150px] px-4 py-3">Status</th>
                <th className="min-w-[200px] px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedContents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="h-8 w-8 text-slate-300" />
                      <p className="text-sm font-medium">Tidak ada konten di antrean ini.</p>
                      <p className="text-xs text-slate-400">
                        Konten yang baru diajukan oleh staff akan otomatis muncul di sini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedContents.map((content) => {
                  const isSelected = selectedIds.includes(content.id)
                  const isPendingConcept = content.status === 'PENDING_REVIEW'
                  const isPendingProd = content.status === 'PENDING_PRODUCTION_REVIEW'

                  const platformsList = content.platforms?.length
                    ? content.platforms.map((p) => p.name).join(', ')
                    : content.platform?.name || '-'

                  return (
                    <tr
                      key={content.id}
                      className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                        isSelected ? 'bg-primary/[0.02] dark:bg-primary/[0.04]' : ''
                      }`}
                    >
                      {/* CHECKBOX */}
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(content.id, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600"
                          aria-label={`Select ${content.title}`}
                        />
                      </td>

                      {/* JUDUL & BRIEF */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
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
                            <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                              {content.brief}
                            </p>
                          )}

                          {/* Link Produksi jika ada */}
                          {content.production_link && (
                            <div className="pt-1">
                              <a
                                href={content.production_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:underline dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Buka Tautan Hasil Produksi
                              </a>
                            </div>
                          )}

                          {/* Catatan revisi jika ada */}
                          {content.status === 'REVISION_REQUIRED' && content.latest_comment && (
                            <p className="rounded bg-rose-50 p-1.5 text-[11px] font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                              <strong>Catatan Revisi:</strong> {content.latest_comment}
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
                        {isPendingConcept ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                            <Clock className="h-3.5 w-3.5 text-purple-500" />
                            Review Konsep
                          </span>
                        ) : isPendingProd ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                            <Wrench className="h-3.5 w-3.5 text-indigo-500" />
                            Review Produksi
                          </span>
                        ) : content.status === 'REVISION_REQUIRED' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                            <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
                            Perlu Revisi
                          </span>
                        ) : content.status === 'READY_TO_PUBLISH' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300">
                            <Send className="h-3.5 w-3.5 text-cyan-500" />
                            Siap Publikasi
                          </span>
                        ) : content.status === 'APPROVED' || content.status === 'PUBLISHED' ? (
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

                      {/* AKSI CEPAT & MENU */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Aksi Cepat Konsep */}
                          {role === 'ADMIN' && isPendingConcept && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openActionDialog(content, 'APPROVE_CONCEPT')}
                                className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                                title="Setujui Konsep & Lanjut ke Produksi"
                              >
                                Setujui Konsep
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => openActionDialog(content, 'READY_TO_PUBLISH')}
                                className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                                title="Langsung Siap Publikasi (Bypass)"
                              >
                                Siap Publikasi
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openActionDialog(content, 'REVISION')}
                                className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                                title="Minta Revisi Konsep"
                              >
                                Revisi
                              </Button>
                            </>
                          )}

                          {/* Aksi Cepat Produksi */}
                          {role === 'ADMIN' && isPendingProd && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => openActionDialog(content, 'APPROVE_PRODUCTION')}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Setujui Produksi & Jadikan Siap Publikasi"
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Siap Publikasi
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openActionDialog(content, 'REVISION')}
                                className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                                title="Minta Revisi Produksi"
                              >
                                Revisi
                              </Button>
                            </>
                          )}

                          {/* 3-Dots Dropdown */}
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuId(activeMenuId === content.id ? null : content.id)
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none dark:hover:bg-slate-800"
                              aria-label="Actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {activeMenuId === content.id && (
                              <div
                                ref={menuRef}
                                className="absolute right-0 z-30 mt-1 w-52 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none dark:border-slate-700 dark:bg-slate-800 text-left"
                              >
                                <Link
                                  href={`/content/${content.id}`}
                                  className="flex w-full items-center px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60"
                                  onClick={() => setActiveMenuId(null)}
                                >
                                  <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                  Lihat Detail Lengkap
                                </Link>

                                {content.production_link && (
                                  <a
                                    href={content.production_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex w-full items-center px-4 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                                    onClick={() => setActiveMenuId(null)}
                                  >
                                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                    Buka Link Produksi
                                  </a>
                                )}

                                {role === 'ADMIN' && (
                                  <>
                                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                    {isPendingConcept && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => openActionDialog(content, 'APPROVE_CONCEPT')}
                                          className="flex w-full items-center px-4 py-2 text-xs font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/30"
                                        >
                                          <Check className="mr-2 h-3.5 w-3.5" />
                                          Setujui Konsep (Lanjut Produksi)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openActionDialog(content, 'READY_TO_PUBLISH')}
                                          className="flex w-full items-center px-4 py-2 text-xs font-medium text-cyan-600 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-950/30"
                                        >
                                          <Send className="mr-2 h-3.5 w-3.5" />
                                          Langsung Siap Publikasi
                                        </button>
                                      </>
                                    )}

                                    {isPendingProd && (
                                      <button
                                        type="button"
                                        onClick={() => openActionDialog(content, 'APPROVE_PRODUCTION')}
                                        className="flex w-full items-center px-4 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                      >
                                        <Check className="mr-2 h-3.5 w-3.5" />
                                        Setujui & Siap Publikasi
                                      </button>
                                    )}

                                    {(isPendingConcept || isPendingProd) && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => openActionDialog(content, 'REVISION')}
                                          className="flex w-full items-center px-4 py-2 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                        >
                                          <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                          Minta Revisi
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openActionDialog(content, 'REJECT')}
                                          className="flex w-full items-center px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                        >
                                          <XCircle className="mr-2 h-3.5 w-3.5" />
                                          Tolak Pengajuan
                                        </button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
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
            konten (Urut Terbaru)
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Halaman {currentPage} dari {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Action Dialog (Single Approve, Revision, Reject) */}
      <Dialog
        open={actionModal.open}
        onOpenChange={(open) => !open && setActionModal((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionModal.title}</DialogTitle>
            <DialogDescription>{actionModal.description}</DialogDescription>
          </DialogHeader>

          {actionModal.requiresComment && (
            <div className="space-y-2 py-2">
              <Label htmlFor="action-comment">
                Catatan Revisi / Alasan Evaluasi <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="action-comment"
                placeholder="Tuliskan catatan arahan detail untuk perbaikan tim..."
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                rows={4}
                className="text-xs"
              />
            </div>
          )}

          {actionError && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              {actionError}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionModal((prev) => ({ ...prev, open: false }))}
              disabled={actionSubmitting}
            >
              Batal
            </Button>
            <Button
              variant={actionModal.variant}
              onClick={handleActionSubmit}
              disabled={actionSubmitting}
            >
              {actionSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {actionModal.submitLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Approve Confirmation Modal */}
      <Dialog open={bulkApproveModalOpen} onOpenChange={setBulkApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setujui Massal ({selectedIds.length}) Konten</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menyetujui seluruh konten yang dipilih?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkApproveModalOpen(false)}
              disabled={bulkSubmitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleBulkApproveSubmit}
              disabled={bulkSubmitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {bulkSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Ya, Setujui Semua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
