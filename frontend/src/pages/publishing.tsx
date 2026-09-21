'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from '@/compat/next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  ExternalLink,
  Trash2,
  BarChart3,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  BookmarkCheck,
  Calendar,
  Search,
  Check,
  Copy,
  Info,
  Layers,
  User as UserIcon,
  Filter,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'
import { ENGAGEMENT_FORMULA } from '@/constants'
import { PlatformCluster, PlatformIconOnly } from '@/components/ui/platform-icon'
import { Select } from '@/components/ui/select'
import { formatDate, formatDateWithDay } from '@/lib/utils'
import type { Publication, Content, Platform, PerformanceMetric, UserRole } from '@/types'
import { cn } from '@/lib/utils'

interface PublicationRow extends Publication {
  content?: Pick<Content, 'id' | 'title' | 'topic' | 'status' | 'pic'> & {
    pillar_name?: string | null
    planned_date?: string | null
  }
}

export type UnifiedPublishingStatus =
  | 'NOT_PUBLISHED' // Belum Ditayangkan / Akan Ditayangkan
  | 'PARTIALLY_PUBLISHED' // Sebagian Ditayangkan
  | 'FULLY_PUBLISHED' // Sudah Ditayangkan
  | 'DELAYED' // Terlambat
  | 'CANCELLED' // Dibatalkan

export interface ScheduleInfo {
  diffDays: number | null
  badgeText: string
  badgeVariant: 'yellow' | 'blue' | 'red' | 'green' | 'gray'
  formattedDate: string
  isToday: boolean
  isTomorrow: boolean
  isThisWeek: boolean
  isOverdue: boolean
}

interface GroupedContentPublication {
  contentId: string
  title: string
  topic: string
  pillarName?: string
  pic?: string | null
  plannedDate: string | null
  status: UnifiedPublishingStatus
  statusLabel: string
  publishedCount: number
  totalCount: number
  platforms: PublicationRow[]
  scheduleInfo: ScheduleInfo
  urgencyRank: number
}

function computeScheduleInfo(
  plannedDate: string | null,
  status: UnifiedPublishingStatus
): { scheduleInfo: ScheduleInfo; urgencyRank: number } {
  if (status === 'FULLY_PUBLISHED') {
    return {
      scheduleInfo: {
        diffDays: null,
        badgeText: 'Sudah ditayangkan',
        badgeVariant: 'green',
        formattedDate: formatDateWithDay(plannedDate),
        isToday: false,
        isTomorrow: false,
        isThisWeek: false,
        isOverdue: false,
      },
      urgencyRank: 600,
    }
  }

  if (status === 'CANCELLED') {
    return {
      scheduleInfo: {
        diffDays: null,
        badgeText: 'Dibatalkan',
        badgeVariant: 'gray',
        formattedDate: formatDateWithDay(plannedDate),
        isToday: false,
        isTomorrow: false,
        isThisWeek: false,
        isOverdue: false,
      },
      urgencyRank: 700,
    }
  }

  if (!plannedDate) {
    return {
      scheduleInfo: {
        diffDays: null,
        badgeText: 'Belum dijadwalkan',
        badgeVariant: 'gray',
        formattedDate: 'Belum ada jadwal',
        isToday: false,
        isTomorrow: false,
        isThisWeek: false,
        isOverdue: false,
      },
      urgencyRank: 500,
    }
  }

  const parts = plannedDate.split('T')[0].split('-')
  const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  const now = new Date()
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))

  const formattedDate = formatDateWithDay(plannedDate)

  if (diffDays < 0) {
    const overdueCount = Math.abs(diffDays)
    return {
      scheduleInfo: {
        diffDays,
        badgeText: overdueCount === 1 ? 'Terlambat 1 hari' : `Terlambat ${overdueCount} hari`,
        badgeVariant: 'red',
        formattedDate,
        isToday: false,
        isTomorrow: false,
        isThisWeek: false,
        isOverdue: true,
      },
      urgencyRank: 100,
    }
  }

  if (diffDays === 0) {
    return {
      scheduleInfo: {
        diffDays: 0,
        badgeText: 'Hari ini',
        badgeVariant: 'yellow',
        formattedDate,
        isToday: true,
        isTomorrow: false,
        isThisWeek: true,
        isOverdue: false,
      },
      urgencyRank: 200,
    }
  }

  if (diffDays === 1) {
    return {
      scheduleInfo: {
        diffDays: 1,
        badgeText: 'Besok',
        badgeVariant: 'blue',
        formattedDate,
        isToday: false,
        isTomorrow: true,
        isThisWeek: true,
        isOverdue: false,
      },
      urgencyRank: 300,
    }
  }

  return {
    scheduleInfo: {
      diffDays,
      badgeText: `Dalam ${diffDays} hari`,
      badgeVariant: 'blue',
      formattedDate,
      isToday: false,
      isTomorrow: false,
      isThisWeek: diffDays <= 7,
      isOverdue: false,
    },
    urgencyRank: 400,
  }
}

export default function PublishingPage() {
  const [publications, setPublications] = useState<PublicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [scheduleFilter, setScheduleFilter] = useState<string>('ALL')
  const [platformFilter, setPlatformFilter] = useState<string>('')
  const [picFilter, setPicFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Manage Modal State (Per Content)
  const [manageModalContentId, setManageModalContentId] = useState<string | null>(null)

  // Sub-action Dialog States
  const [publishModal, setPublishModal] = useState<{ open: boolean; pub: PublicationRow | null }>({
    open: false,
    pub: null,
  })
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0])
  const [publishUrl, setPublishUrl] = useState('')
  const [publishNotes, setPublishNotes] = useState('')

  const [cancelModal, setCancelModal] = useState<{ open: boolean; pub: PublicationRow | null }>({
    open: false,
    pub: null,
  })
  const [cancelReason, setCancelReason] = useState('')
  const [cancelMoveToTabungan, setCancelMoveToTabungan] = useState(true)

  const [metricsPub, setMetricsPub] = useState<PublicationRow | null>(null)
  const [metricsForm, setMetricsForm] = useState({
    views: '0',
    likes: '0',
    comments: '0',
    shares: '0',
    saves: '0',
    reach: '0',
    recorded_at: new Date().toISOString().split('T')[0],
  })

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [isEditingSchedule, setIsEditingSchedule] = useState(false)
  const [newScheduleDate, setNewScheduleDate] = useState('')
  const [scheduleSaving, setScheduleSaving] = useState(false)

  const loadPublications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const res = await apiFetch(`/api/publications?${params.toString()}`)
      const data = await res.json()
      setPublications(data.publications || [])
    } catch (err) {
      console.error('Failed to load publications:', err)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    loadPublications()
    apiFetch('/api/master-data')
      .then((res) => res.json())
      .then((data) => setPlatforms(data.platforms || []))
      .catch(console.error)

    apiFetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user?.profile?.role && setUserRole(data.user.profile.role))
      .catch(() => {})
  }, [loadPublications])

  function selectMonth(year: number, month: number) {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    setDateFrom(fmt(firstDay))
    setDateTo(fmt(lastDay))
  }

  // Flash temporary success message
  function notifySuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  // Copy link helper
  function copyToClipboard(url: string) {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2500)
  }

  // 1. Group Publications by Content (Satu Konten = Satu Baris)
  const groupedContents = useMemo(() => {
    const map = new Map<
      string,
      Omit<GroupedContentPublication, 'scheduleInfo' | 'urgencyRank'>
    >()

    publications.forEach((pub) => {
      const contentId = pub.content_id || pub.id
      const existing = map.get(contentId)
      // Prioritas 1: Tanggal rencana konten terbaru (pub.content?.planned_date)
      // Prioritas 2: Tanggal publikasi (pub.planned_publish_date)
      const effectiveDate = pub.content?.planned_date || pub.planned_publish_date || null

      if (existing) {
        existing.platforms.push(pub)
        if (pub.content?.planned_date) {
          existing.plannedDate = pub.content.planned_date
        } else if (!existing.plannedDate && pub.planned_publish_date) {
          existing.plannedDate = pub.planned_publish_date
        }
      } else {
        map.set(contentId, {
          contentId,
          title: pub.content?.title || 'Konten Tanpa Judul',
          topic: pub.content?.topic || '',
          pillarName: pub.content?.pillar_name || undefined,
          pic: pub.content?.pic || null,
          plannedDate: effectiveDate,
          status: 'NOT_PUBLISHED',
          statusLabel: 'Belum Dijadwalkan',
          publishedCount: 0,
          totalCount: 1,
          platforms: [pub],
        })
      }
    })

    // Compute status, progress & schedule indicators per content group
    const groups: GroupedContentPublication[] = Array.from(map.values()).map((group) => {
      const total = group.platforms.length
      const published = group.platforms.filter((p) => p.status === 'PUBLISHED').length
      const cancelled = group.platforms.filter(
        (p) => p.status === 'CANCELLED' || p.status === 'CANCEL'
      ).length
      const delayed = group.platforms.filter(
        (p) => p.status === 'DELAYED' || p.status === 'DELAY'
      ).length

      group.totalCount = total
      group.publishedCount = published

      let status: UnifiedPublishingStatus = 'NOT_PUBLISHED'
      let statusLabel = 'Belum Dijadwalkan'

      if (cancelled === total && total > 0) {
        status = 'CANCELLED'
        statusLabel = 'Dibatalkan'
      } else if (published === total && total > 0) {
        status = 'FULLY_PUBLISHED'
        statusLabel = 'Sudah Ditayangkan'
      } else if (delayed > 0) {
        status = 'DELAYED'
        statusLabel = 'Terlambat'
      } else if (published > 0) {
        status = 'PARTIALLY_PUBLISHED'
        statusLabel = 'Sebagian Ditayangkan'
      } else if (group.plannedDate) {
        const parts = group.plannedDate.split('T')[0].split('-')
        const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        const now = new Date()
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const diffDays = Math.round(
          (targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (diffDays < 0) {
          status = 'DELAYED'
          statusLabel = 'Terlambat'
        } else if (diffDays === 0) {
          status = 'NOT_PUBLISHED'
          statusLabel = 'Hari Ini'
        } else {
          status = 'NOT_PUBLISHED'
          statusLabel = 'Akan Ditayangkan'
        }
      } else {
        status = 'NOT_PUBLISHED'
        statusLabel = 'Belum Dijadwalkan'
      }

      const { scheduleInfo, urgencyRank } = computeScheduleInfo(group.plannedDate, status)

      return {
        ...group,
        status,
        statusLabel,
        scheduleInfo,
        urgencyRank,
      }
    })

    return groups
  }, [publications])

  // Summary counts for Quick Summary Cards
  const summaryCounts = useMemo(() => {
    let today = 0
    let tomorrow = 0
    let overdue = 0

    groupedContents.forEach((g) => {
      if (g.status === 'FULLY_PUBLISHED' || g.status === 'CANCELLED') return
      if (g.scheduleInfo.isOverdue) overdue++
      else if (g.scheduleInfo.isToday) today++
      else if (g.scheduleInfo.isTomorrow) tomorrow++
    })

    return { today, tomorrow, overdue }
  }, [groupedContents])

  // Extract unique PICs for filter
  const uniquePics = useMemo(() => {
    const set = new Set<string>()
    groupedContents.forEach((g) => {
      if (g.pic) set.add(g.pic)
    })
    return Array.from(set).sort()
  }, [groupedContents])

  // Filter Grouped Contents
  const filteredContents = useMemo(() => {
    return groupedContents.filter((group) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = group.title.toLowerCase().includes(q)
        const matchTopic = group.topic.toLowerCase().includes(q)
        const matchPillar = (group.pillarName || '').toLowerCase().includes(q)
        const matchPic = (group.pic || '').toLowerCase().includes(q)
        if (!matchTitle && !matchTopic && !matchPillar && !matchPic) return false
      }

      // 2. Schedule & Status Filter
      if (scheduleFilter === 'TODAY') {
        if (!group.scheduleInfo.isToday || group.status === 'FULLY_PUBLISHED' || group.status === 'CANCELLED')
          return false
      } else if (scheduleFilter === 'TOMORROW') {
        if (!group.scheduleInfo.isTomorrow || group.status === 'FULLY_PUBLISHED' || group.status === 'CANCELLED')
          return false
      } else if (scheduleFilter === 'THIS_WEEK') {
        if (!group.scheduleInfo.isThisWeek || group.status === 'FULLY_PUBLISHED' || group.status === 'CANCELLED')
          return false
      } else if (scheduleFilter === 'OVERDUE') {
        if (!group.scheduleInfo.isOverdue || group.status === 'FULLY_PUBLISHED' || group.status === 'CANCELLED')
          return false
      } else if (scheduleFilter === 'FULLY_PUBLISHED') {
        if (group.status !== 'FULLY_PUBLISHED') return false
      }

      // 3. Platform Filter
      if (platformFilter) {
        const hasPlatform = group.platforms.some(
          (p) => p.platform_id === platformFilter || p.platform?.name === platformFilter
        )
        if (!hasPlatform) return false
      }

      // 4. PIC Filter
      if (picFilter) {
        if (group.pic !== picFilter) return false
      }

      return true
    })
  }, [groupedContents, searchQuery, scheduleFilter, platformFilter, picFilter])

  // Automatic Urgency-Based Sorting
  const sortedContents = useMemo(() => {
    return [...filteredContents].sort((a, b) => {
      if (a.urgencyRank !== b.urgencyRank) {
        return a.urgencyRank - b.urgencyRank
      }
      // For overdue (rank 100), sort by diffDays ascending (most overdue first)
      if (
        a.urgencyRank === 100 &&
        a.scheduleInfo.diffDays !== null &&
        b.scheduleInfo.diffDays !== null
      ) {
        return a.scheduleInfo.diffDays - b.scheduleInfo.diffDays
      }
      // For upcoming dates, sort ascending (closest date first)
      if (a.plannedDate && b.plannedDate) {
        return a.plannedDate.localeCompare(b.plannedDate)
      }
      return 0
    })
  }, [filteredContents])

  // Active Group for Modal
  const activeManageGroup = useMemo(() => {
    if (!manageModalContentId) return null
    return groupedContents.find((g) => g.contentId === manageModalContentId) || null
  }, [groupedContents, manageModalContentId])

  // Aksi: Simpan Penayangan
  async function handleMarkPublished() {
    if (!publishModal.pub) return
    setSaving(true)
    setError(null)

    try {
      const res = await apiFetch(`/api/publications/${publishModal.pub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_publish_date: publishDate || new Date().toISOString().split('T')[0],
          url: publishUrl ? publishUrl.trim() : null,
          status: 'PUBLISHED',
          notes: publishNotes ? publishNotes.trim() : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal menandai publikasi.')
        return
      }

      setPublishModal({ open: false, pub: null })
      setPublishUrl('')
      setPublishNotes('')
      notifySuccess('Status publikasi berhasil disimpan sebagai Sudah Ditayangkan.')
      await loadPublications()
    } catch {
      setError('Terjadi kesalahan jaringan saat menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  // Aksi: Batalkan Publikasi
  async function handleCancelPublication() {
    if (!cancelModal.pub) return
    if (!cancelReason.trim()) {
      setError('Mohon isi alasan mengapa publikasi tidak jadi ditayangkan.')
      return
    }
    setSaving(true)
    setError(null)

    try {
      const res = await apiFetch(`/api/publications/${cancelModal.pub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          cancel_reason: cancelReason.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal membatalkan publikasi.')
        return
      }

      if (cancelMoveToTabungan && cancelModal.pub.content_id) {
        await apiFetch(`/api/contents/${cancelModal.pub.content_id}/move-to-tabungan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: `Dibatalkan dari publikasi (${cancelModal.pub.platform?.name || 'Platform'}): ${cancelReason}`,
          }),
        })
      }

      setCancelModal({ open: false, pub: null })
      setCancelReason('')
      notifySuccess('Publikasi berhasil dibatalkan.')
      await loadPublications()
    } catch {
      setError('Terjadi kesalahan jaringan saat membatalkan.')
    } finally {
      setSaving(false)
    }
  }

  // Aksi: Pindahkan Konten Terlambat ke Bank Konten
  async function handleMoveDelayToTabungan(pub: PublicationRow) {
    if (!pub.content_id) return
    if (
      !confirm(
        'Pindahkan konten yang terlambat ini ke Bank Konten agar dapat dijadwalkan ulang dengan aman di kemudian hari?'
      )
    )
      return
    try {
      const res = await apiFetch(`/api/contents/${pub.content_id}/move-to-tabungan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: `Publikasi tertunda/terlambat (jadwal upload: ${pub.planned_publish_date || '-'})`,
        }),
      })
      if (res.ok) {
        notifySuccess('Konten berhasil dipindahkan ke Bank Konten.')
        await loadPublications()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Aksi: Update Jadwal Upload Grup Publikasi & Sinkronisasi
  async function handleUpdateGroupSchedule(group: GroupedContentPublication) {
    if (!newScheduleDate || group.platforms.length === 0) return
    setScheduleSaving(true)
    try {
      const pubToUpdate = group.platforms[0]
      const res = await apiFetch(`/api/publications/${pubToUpdate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planned_publish_date: newScheduleDate,
        }),
      })
      if (res.ok) {
        setIsEditingSchedule(false)
        notifySuccess('Jadwal upload berhasil disinkronkan dan diperbarui!')
        await loadPublications()
      } else {
        const d = await res.json()
        alert(d.error || 'Gagal mengubah jadwal upload')
      }
    } catch (e) {
      console.error(e)
      alert('Terjadi kesalahan saat menyimpan jadwal baru')
    } finally {
      setScheduleSaving(false)
    }
  }

  // Aksi: Buka Modal Metrik
  function openMetrics(pub: PublicationRow) {
    setMetricsPub(pub)
    const latest: PerformanceMetric | undefined = pub.performance_metrics?.[0]
    setMetricsForm({
      views: String(latest?.views ?? 0),
      likes: String(latest?.likes ?? 0),
      comments: String(latest?.comments ?? 0),
      shares: String(latest?.shares ?? 0),
      saves: String(latest?.saves ?? 0),
      reach: String(latest?.reach ?? 0),
      recorded_at: latest?.recorded_at || new Date().toISOString().split('T')[0],
    })
  }

  // Aksi: Simpan Metrik
  async function handleSaveMetrics(e: React.FormEvent) {
    e.preventDefault()
    if (!metricsPub) return
    setSaving(true)
    setError(null)

    try {
      const res = await apiFetch(`/api/publications/${metricsPub.id}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          views: Number(metricsForm.views),
          likes: Number(metricsForm.likes),
          comments: Number(metricsForm.comments),
          shares: Number(metricsForm.shares),
          saves: Number(metricsForm.saves),
          reach: Number(metricsForm.reach),
          recorded_at: metricsForm.recorded_at,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan data metrik performa.')
        return
      }

      setMetricsPub(null)
      notifySuccess('Metrik performa berhasil diperbarui.')
      await loadPublications()
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  // Aksi: Hapus Publication (Admin)
  async function handleDeletePublication(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus data penayangan platform ini?')) return
    try {
      await apiFetch(`/api/publications/${id}`, { method: 'DELETE' })
      notifySuccess('Data penayangan platform berhasil dihapus.')
      await loadPublications()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  // Badge Status Helper
  function renderStatusBadge(status: UnifiedPublishingStatus, label?: string) {
    switch (status) {
      case 'FULLY_PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            {label || 'Sudah Ditayangkan'}
          </span>
        )
      case 'PARTIALLY_PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            {label || 'Sebagian Ditayangkan'}
          </span>
        )
      case 'DELAYED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            {label || 'Terlambat'}
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <XCircle className="h-3.5 w-3.5 text-slate-500" />
            {label || 'Dibatalkan'}
          </span>
        )
      case 'NOT_PUBLISHED':
      default:
        if (label === 'Hari Ini') {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              Hari Ini
            </span>
          )
        }
        if (label === 'Akan Ditayangkan') {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300">
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Akan Ditayangkan
            </span>
          )
        }
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {label || 'Belum Dijadwalkan'}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi Sukses */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg animate-in fade-in slide-in-from-bottom-3 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Header & Penjelasan Modul Ramah Pengguna */}
      <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50/90 via-sky-50/70 to-blue-50/80 p-5 shadow-xs dark:border-teal-900/50 dark:from-teal-950/40 dark:via-slate-900 dark:to-blue-950/30">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm ring-4 ring-teal-100 dark:ring-teal-900/50">
              <Send className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold tracking-tight text-teal-950 dark:text-teal-200">
                Antrean Publikasi
              </h1>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Pantau konten yang siap diunggah ke media sosial, ketahui jadwal upload yang paling
                mendesak, dan catat tautan publikasi setiap platform secara teratur.
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs text-teal-800 dark:text-teal-300 font-medium">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Satu konten dapat ditayangkan di beberapa platform. Klik tombol{' '}
                  <span className="font-semibold underline underline-offset-2">
                    Atur Penayangan
                  </span>{' '}
                  untuk mengisi tautan atau melihat platform terkait.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Ringkasan Jadwal (3 Kartu Ringkas yang dapat diklik sebagai filter) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Card 1: Hari Ini */}
        <button
          type="button"
          onClick={() => setScheduleFilter(scheduleFilter === 'TODAY' ? 'ALL' : 'TODAY')}
          className={cn(
            'flex items-center justify-between rounded-xl border p-4 text-left transition-all shadow-2xs cursor-pointer',
            scheduleFilter === 'TODAY'
              ? 'border-amber-400 bg-amber-50/90 ring-2 ring-amber-400 dark:bg-amber-950/40 dark:border-amber-700'
              : 'border-border/80 bg-surface hover:border-amber-300/80 hover:bg-amber-50/40 dark:hover:bg-amber-950/20'
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 shadow-2xs">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-secondary">Hari Ini</p>
              <p className="text-base font-extrabold text-ink leading-tight">
                {summaryCounts.today}{' '}
                <span className="text-xs font-medium text-ink-muted">konten</span>
              </p>
            </div>
          </div>
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors',
              scheduleFilter === 'TODAY'
                ? 'bg-amber-500 text-white'
                : 'bg-surface-muted text-ink-secondary'
            )}
          >
            {scheduleFilter === 'TODAY' ? 'Aktif' : 'Pilih'}
          </span>
        </button>

        {/* Card 2: Besok */}
        <button
          type="button"
          onClick={() => setScheduleFilter(scheduleFilter === 'TOMORROW' ? 'ALL' : 'TOMORROW')}
          className={cn(
            'flex items-center justify-between rounded-xl border p-4 text-left transition-all shadow-2xs cursor-pointer',
            scheduleFilter === 'TOMORROW'
              ? 'border-sky-400 bg-sky-50/90 ring-2 ring-sky-400 dark:bg-sky-950/40 dark:border-sky-700'
              : 'border-border/80 bg-surface hover:border-sky-300/80 hover:bg-sky-50/40 dark:hover:bg-sky-950/20'
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 shadow-2xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-secondary">Besok</p>
              <p className="text-base font-extrabold text-ink leading-tight">
                {summaryCounts.tomorrow}{' '}
                <span className="text-xs font-medium text-ink-muted">konten</span>
              </p>
            </div>
          </div>
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors',
              scheduleFilter === 'TOMORROW'
                ? 'bg-sky-500 text-white'
                : 'bg-surface-muted text-ink-secondary'
            )}
          >
            {scheduleFilter === 'TOMORROW' ? 'Aktif' : 'Pilih'}
          </span>
        </button>

        {/* Card 3: Terlambat */}
        <button
          type="button"
          onClick={() => setScheduleFilter(scheduleFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
          className={cn(
            'flex items-center justify-between rounded-xl border p-4 text-left transition-all shadow-2xs cursor-pointer',
            scheduleFilter === 'OVERDUE'
              ? 'border-rose-400 bg-rose-50/90 ring-2 ring-rose-400 dark:bg-rose-950/40 dark:border-rose-700'
              : 'border-border/80 bg-surface hover:border-rose-300/80 hover:bg-rose-50/40 dark:hover:bg-rose-950/20'
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 shadow-2xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-secondary">Terlambat</p>
              <p className="text-base font-extrabold text-ink leading-tight">
                {summaryCounts.overdue}{' '}
                <span className="text-xs font-medium text-ink-muted">konten</span>
              </p>
            </div>
          </div>
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors',
              scheduleFilter === 'OVERDUE'
                ? 'bg-rose-500 text-white'
                : 'bg-surface-muted text-ink-secondary'
            )}
          >
            {scheduleFilter === 'OVERDUE' ? 'Aktif' : 'Pilih'}
          </span>
        </button>
      </div>

      {/* 3. Filter & Pencarian Sederhana */}
      <Card className="border-border/80 shadow-xs">
        <div className="p-4 sm:p-5 space-y-4">
          {/* Quick Period Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ink-secondary mr-1">
                Filter Rentang Waktu:
              </span>
              <Button
                variant={!dateFrom && !dateTo ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                }}
                className="h-8 text-xs rounded-lg"
              >
                Semua Waktu
              </Button>
              {[
                {
                  label: 'Bulan Ini',
                  fn: () => {
                    const now = new Date()
                    selectMonth(now.getFullYear(), now.getMonth() + 1)
                  },
                },
                {
                  label: 'Bulan Lalu',
                  fn: () => {
                    const now = new Date()
                    selectMonth(now.getFullYear(), now.getMonth())
                  },
                },
              ].map((b) => (
                <Button
                  key={b.label}
                  variant="outline"
                  size="sm"
                  onClick={b.fn}
                  className="h-8 text-xs rounded-lg"
                >
                  {b.label}
                </Button>
              ))}
            </div>

            {scheduleFilter !== 'ALL' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScheduleFilter('ALL')}
                className="h-8 text-xs text-ink-secondary hover:text-ink"
              >
                Reset Filter Jadwal ({scheduleFilter})
              </Button>
            )}
          </div>

          {/* Filter Rows */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-12">
            {/* Search */}
            <div className="relative md:col-span-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input
                type="text"
                placeholder="Cari judul konten, topik, atau PIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Schedule Filter Dropdown */}
            <div className="md:col-span-3">
              <Select
                value={scheduleFilter}
                onChange={(e) => setScheduleFilter(e.target.value)}
                className="text-xs h-9 w-full font-medium"
              >
                <option value="ALL">Semua Jadwal</option>
                <option value="TODAY">Harus Diunggah Hari Ini</option>
                <option value="TOMORROW">Jadwal Besok</option>
                <option value="THIS_WEEK">Jadwal Minggu Ini</option>
                <option value="OVERDUE">Terlambat</option>
                <option value="FULLY_PUBLISHED">Sudah Ditayangkan</option>
              </Select>
            </div>

            {/* Platform Filter */}
            <div className="md:col-span-2">
              <Select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="text-xs h-9 w-full font-normal"
              >
                <option value="">Semua Platform</option>
                {platforms
                  .filter(
                    (p) =>
                      !['linkedin', 'website', 'twitter/x', 'twitter', 'x'].includes(
                        p.name.toLowerCase().trim()
                      )
                  )
                  .map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </div>

            {/* PIC Filter */}
            <div className="md:col-span-3">
              <Select
                value={picFilter}
                onChange={(e) => setPicFilter(e.target.value)}
                className="text-xs h-9 w-full"
              >
                <option value="">Semua Penanggung Jawab (PIC)</option>
                {uniquePics.map((pic) => (
                  <option key={pic} value={pic}>
                    PIC: {pic}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Ringkasan Singkat & Total Baris */}
      <div className="flex items-center justify-between px-1 text-xs text-ink-muted">
        <div>
          Menampilkan <span className="font-semibold text-ink">{sortedContents.length}</span>{' '}
          konten publikasi (diurutkan otomatis berdasarkan urgensi jadwal)
        </div>
        {scheduleFilter !== 'ALL' && (
          <span className="text-teal-700 dark:text-teal-400 font-medium">
            * Filter jadwal aktif: {scheduleFilter}
          </span>
        )}
      </div>

      {/* 5. Tabel Utama Antrean Publikasi (1 Konten = 1 Baris) */}
      {loading ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-teal-600 mb-2" />
            <p className="text-sm font-medium text-ink">Memuat antrean publikasi...</p>
            <p className="text-xs text-ink-muted">Mengumpulkan data konten dan platform target.</p>
          </div>
        </Card>
      ) : sortedContents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-ink-muted mb-3">
              <Filter className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-ink">Tidak ada konten yang sesuai</h3>
            <p className="text-xs text-ink-muted max-w-sm mt-1">
              Tidak ditemukan konten dalam antrean dengan kriteria filter saat ini. Coba ubah kata
              kunci pencarian atau reset filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setScheduleFilter('ALL')
                setPlatformFilter('')
                setPicFilter('')
                setDateFrom('')
                setDateTo('')
              }}
              className="mt-4 text-xs"
            >
              Reset Semua Filter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden shadow-xs border-border/80">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-border bg-surface-muted/70">
                <tr>
                  <th className="w-12 px-3 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    No
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    Konten
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    Target Platform
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    Jadwal Upload
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    Progress Penayangan
                  </th>
                  <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {sortedContents.map((group, index) => {
                  const platformNames = group.platforms
                    .map((p) => p.platform?.name)
                    .filter((n): n is string => Boolean(n))

                  const progressPct =
                    group.totalCount > 0
                      ? Math.round((group.publishedCount / group.totalCount) * 100)
                      : 0

                  return (
                    <tr
                      key={group.contentId}
                      className="group transition-colors hover:bg-surface-muted/50"
                    >
                      {/* Kolom Nomor */}
                      <td className="w-12 px-3 py-4 text-center align-middle text-xs font-semibold text-ink-muted">
                        {index + 1}
                      </td>

                      {/* Kolom 1: Konten */}
                      <td className="px-5 py-4 align-middle max-w-sm">
                        <div className="space-y-1">
                          <Link
                            href={`/content/${group.contentId}`}
                            className="font-semibold text-sm text-ink hover:text-primary transition-colors line-clamp-2 leading-snug"
                            title={group.title}
                          >
                            {group.title}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                            {group.topic && (
                              <span className="font-medium text-ink-secondary truncate max-w-[200px]">
                                {group.topic}
                              </span>
                            )}
                            {group.topic && group.pillarName && <span>•</span>}
                            {group.pillarName && (
                              <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                {group.pillarName}
                              </span>
                            )}
                            {group.pic && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
                                  <UserIcon className="h-3 w-3" />
                                  {group.pic}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Kolom 2: Target Platform */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <PlatformCluster
                            platforms={platformNames}
                            maxDisplay={3}
                            size="md"
                          />
                        </div>
                      </td>

                      {/* Kolom 3: Jadwal Upload (Indikator Waktu Relatif + Format Indonesia) */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap text-xs">
                        <div className="space-y-1">
                          {/* Relative Time Badge */}
                          <div>
                            {group.scheduleInfo.badgeVariant === 'yellow' && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                                <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                {group.scheduleInfo.badgeText}
                              </span>
                            )}
                            {group.scheduleInfo.badgeVariant === 'blue' && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                                <Calendar className="h-3 w-3 text-sky-600 dark:text-sky-400" />
                                {group.scheduleInfo.badgeText}
                              </span>
                            )}
                            {group.scheduleInfo.badgeVariant === 'red' && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                                {group.scheduleInfo.badgeText}
                              </span>
                            )}
                            {group.scheduleInfo.badgeVariant === 'green' && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                {group.scheduleInfo.badgeText}
                              </span>
                            )}
                            {group.scheduleInfo.badgeVariant === 'gray' && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                {group.scheduleInfo.badgeText}
                              </span>
                            )}
                          </div>
                          {/* Indonesian Date Format */}
                          <p className="text-ink-secondary text-xs font-medium">
                            {group.scheduleInfo.formattedDate}
                          </p>
                        </div>
                      </td>

                      {/* Kolom 4: Progress Penayangan */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap">
                        <div className="flex flex-col gap-1 w-40">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-ink">
                              {group.publishedCount} dari {group.totalCount} platform
                            </span>
                          </div>
                          {/* Progress Bar Visual */}
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-300',
                                group.status === 'FULLY_PUBLISHED'
                                  ? 'bg-emerald-500'
                                  : group.status === 'PARTIALLY_PUBLISHED'
                                  ? 'bg-amber-500'
                                  : group.status === 'DELAYED'
                                  ? 'bg-rose-500'
                                  : 'bg-blue-400'
                              )}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          {/* Descriptive Subtext */}
                          <p className="text-[11px] text-ink-muted">
                            {group.publishedCount === 0
                              ? 'Belum ada yang ditayangkan'
                              : group.publishedCount === group.totalCount
                              ? 'Semua platform sudah ditayangkan'
                              : 'Sebagian sudah ditayangkan'}
                          </p>
                        </div>
                      </td>

                      {/* Kolom 5: Status Terpadu */}
                      <td className="px-4 py-4 align-middle whitespace-nowrap">
                        {renderStatusBadge(group.status, group.statusLabel)}
                      </td>

                      {/* Kolom 6: Aksi Tunggal */}
                      <td className="px-5 py-4 align-middle whitespace-nowrap text-right">
                        <Button
                          size="sm"
                          onClick={() => setManageModalContentId(group.contentId)}
                          className={cn(
                            'text-xs font-semibold h-8.5 rounded-lg px-3.5 shadow-2xs transition-all',
                            group.status === 'FULLY_PUBLISHED'
                              ? 'bg-surface border border-border text-ink hover:bg-surface-muted'
                              : group.status === 'CANCELLED'
                              ? 'bg-surface border border-border text-ink-secondary hover:bg-surface-muted'
                              : 'bg-teal-600 hover:bg-teal-700 text-white'
                          )}
                        >
                          <Sparkles className="mr-1.5 h-3.5 w-3.5 opacity-80" />
                          {group.status === 'FULLY_PUBLISHED'
                            ? 'Lihat Publikasi'
                            : group.status === 'CANCELLED'
                            ? 'Lihat Detail'
                            : 'Atur Penayangan'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL DETAIL PENAYANGAN PER KONTEN (KELOLA PENAYANGAN)                 */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(activeManageGroup)}
        onOpenChange={(open) => !open && setManageModalContentId(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          {activeManageGroup && (
            <div className="space-y-6">
              {/* Header Info Konten */}
              <div className="border-b border-border pb-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md dark:bg-teal-950 dark:text-teal-300">
                        Detail Penayangan Konten
                      </span>
                      {renderStatusBadge(activeManageGroup.status, activeManageGroup.statusLabel)}
                    </div>
                    <h2 className="text-lg font-bold text-ink leading-snug">
                      {activeManageGroup.title}
                    </h2>
                  </div>
                  <Link
                    href={`/content/${activeManageGroup.contentId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0 pt-1"
                  >
                    <span>Buka Rencana</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Metadata Pill Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl bg-surface-muted/60 p-3.5 text-xs">
                  <div>
                    <span className="text-ink-muted block text-[11px]">Topik:</span>
                    <span className="font-semibold text-ink">
                      {activeManageGroup.topic || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[11px]">Content Pillar:</span>
                    <span className="font-semibold text-ink">
                      {activeManageGroup.pillarName || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[11px]">Penanggung Jawab (PIC):</span>
                    <span className="font-semibold text-ink">
                      {activeManageGroup.pic || '-'}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-ink-muted block text-[11px] mb-0.5">Jadwal Upload:</span>
                    {!isEditingSchedule ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-ink">
                          {formatDateWithDay(activeManageGroup.plannedDate)}
                        </span>
                        {activeManageGroup.status !== 'FULLY_PUBLISHED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewScheduleDate(activeManageGroup.plannedDate?.split('T')[0] || '')
                              setIsEditingSchedule(true)
                            }}
                            className="text-[11px] text-teal-600 hover:text-teal-700 underline font-medium ml-1 cursor-pointer"
                          >
                            Ubah
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="date"
                          value={newScheduleDate}
                          onChange={(e) => setNewScheduleDate(e.target.value)}
                          className="text-xs rounded-md border border-border px-2 py-1 bg-surface text-ink shadow-2xs"
                        />
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                          disabled={scheduleSaving || !newScheduleDate}
                          onClick={() => handleUpdateGroupSchedule(activeManageGroup)}
                        >
                          {scheduleSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Simpan'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={scheduleSaving}
                          onClick={() => setIsEditingSchedule(false)}
                        >
                          Batal
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Penayangan Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink-secondary">
                      Progres Penayangan Platform:
                    </span>
                    <span className="font-bold text-ink">
                      {activeManageGroup.publishedCount} dari {activeManageGroup.totalCount} Platform
                      Selesai (
                      {activeManageGroup.totalCount > 0
                        ? Math.round(
                            (activeManageGroup.publishedCount / activeManageGroup.totalCount) * 100
                          )
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        activeManageGroup.status === 'FULLY_PUBLISHED'
                          ? 'bg-emerald-500'
                          : activeManageGroup.status === 'PARTIALLY_PUBLISHED'
                          ? 'bg-amber-500'
                          : 'bg-teal-500'
                      )}
                      style={{
                        width: `${
                          activeManageGroup.totalCount > 0
                            ? (activeManageGroup.publishedCount / activeManageGroup.totalCount) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Daftar Platform Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-teal-600" />
                    Daftar Platform Penayangan ({activeManageGroup.platforms.length})
                  </h3>
                  <span className="text-xs text-ink-muted">
                    Atur tautan dan status penayangan untuk masing-masing platform
                  </span>
                </div>

                <div className="space-y-3">
                  {activeManageGroup.platforms.map((pub) => {
                    const isPubPublished = pub.status === 'PUBLISHED'
                    const isPubDelayed = pub.status === 'DELAYED' || pub.status === 'DELAY'
                    const isPubCancelled = pub.status === 'CANCELLED' || pub.status === 'CANCEL'

                    return (
                      <div
                        key={pub.id}
                        className={cn(
                          'rounded-xl border p-4 transition-all space-y-3.5',
                          isPubPublished
                            ? 'border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10'
                            : isPubDelayed
                            ? 'border-rose-200/80 bg-rose-50/20 dark:border-rose-900/40 dark:bg-rose-950/10'
                            : isPubCancelled
                            ? 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/20 opacity-75'
                            : 'border-border bg-surface'
                        )}
                      >
                        {/* Header Platform */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                          <div className="flex items-center gap-2.5">
                            <PlatformIconOnly
                              name={pub.platform?.name || 'Umum'}
                              size="md"
                            />
                            <div>
                              <h4 className="font-bold text-sm text-ink leading-none">
                                {pub.platform?.name || 'Platform Media Sosial'}
                              </h4>
                              <p className="text-[11px] text-ink-muted mt-0.5">
                                Jadwal Upload: {formatDateWithDay(pub.planned_publish_date)}
                              </p>
                            </div>
                          </div>

                          {/* Status Badge Platform */}
                          <div>
                            {isPubPublished ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Sudah Ditayangkan
                              </span>
                            ) : isPubDelayed ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                <AlertTriangle className="h-3 w-3 text-rose-600" />
                                Terlambat Tayang
                              </span>
                            ) : isPubCancelled ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <XCircle className="h-3 w-3 text-slate-500" />
                                Dibatalkan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                <Calendar className="h-3 w-3 text-blue-600" />
                                Belum Ditayangkan
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Body Details of Platform */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                          {/* Tanggal Aktual & Notes */}
                          <div>
                            <span className="text-ink-muted block text-[11px]">
                              Tanggal Aktual Penayangan:
                            </span>
                            <span className="font-semibold text-ink">
                              {pub.actual_publish_date
                                ? formatDate(pub.actual_publish_date)
                                : isPubPublished
                                ? 'Tanggal belum dicatat'
                                : 'Belum ditayangkan'}
                            </span>
                            {pub.notes && (
                              <p className="text-[11px] text-ink-secondary mt-1 bg-surface-muted/50 p-1.5 rounded-md">
                                <span className="font-medium">Catatan:</span> {pub.notes}
                              </p>
                            )}
                            {pub.cancel_reason && (
                              <p className="text-[11px] text-danger mt-1 bg-rose-50 dark:bg-rose-950/30 p-1.5 rounded-md border border-rose-200/50">
                                <span className="font-medium">Alasan Batal:</span>{' '}
                                {pub.cancel_reason}
                              </p>
                            )}
                          </div>

                          {/* Tautan Publikasi */}
                          <div>
                            <span className="text-ink-muted block text-[11px]">
                              Tautan / URL Publikasi:
                            </span>
                            {pub.url ? (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <a
                                  href={pub.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline truncate max-w-[200px]"
                                  title={pub.url}
                                >
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{pub.url}</span>
                                </a>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(pub.url!)}
                                  className="h-6 w-6 text-ink-muted hover:text-ink"
                                  title="Salin Tautan"
                                >
                                  {copiedUrl === pub.url ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <span className="italic text-ink-muted text-xs">
                                Belum diisi
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons for this Platform */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/40">
                          {/* 1. Belum Ditayangkan / Terlambat: Tombol Tandai Tayang */}
                          {!isPubPublished && !isPubCancelled && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setPublishModal({ open: true, pub })
                                setPublishDate(
                                  pub.actual_publish_date ||
                                    new Date().toISOString().split('T')[0]
                                )
                                setPublishUrl(pub.url || '')
                                setPublishNotes(pub.notes || '')
                              }}
                              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs"
                            >
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              {pub.url ? 'Tandai Sudah Tayang' : 'Tambah Data Penayangan'}
                            </Button>
                          )}

                          {/* 2. Sudah Tayang: Tombol Edit Data & Input Metrik */}
                          {isPubPublished && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPublishModal({ open: true, pub })
                                  setPublishDate(
                                    pub.actual_publish_date ||
                                      new Date().toISOString().split('T')[0]
                                  )
                                  setPublishUrl(pub.url || '')
                                  setPublishNotes(pub.notes || '')
                                }}
                                className="text-xs h-8 rounded-lg"
                              >
                                Ubah Data / Tautan
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openMetrics(pub)}
                                className="text-xs h-8 rounded-lg text-teal-700 border-teal-200 hover:bg-teal-50 dark:text-teal-300 dark:border-teal-800"
                              >
                                <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                                Metrik Performa
                              </Button>
                            </>
                          )}

                          {/* 3. Terlambat: Tombol Pindah ke Bank Konten */}
                          {isPubDelayed && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMoveDelayToTabungan(pub)}
                              className="text-xs h-8 rounded-lg text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-300 dark:border-indigo-800"
                              title="Pindahkan ke Bank Konten untuk dijadwalkan ulang"
                            >
                              <BookmarkCheck className="mr-1.5 h-3.5 w-3.5" />
                              Ke Bank Konten
                            </Button>
                          )}

                          {/* 4. Batalkan Penayangan (jika belum published & belum cancel) */}
                          {!isPubPublished && !isPubCancelled && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCancelModal({ open: true, pub })
                                setCancelReason('')
                                setCancelMoveToTabungan(true)
                              }}
                              className="text-xs h-8 rounded-lg text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900"
                            >
                              <XCircle className="mr-1.5 h-3.5 w-3.5" />
                              Batalkan
                            </Button>
                          )}

                          {/* 5. Admin: Hapus Platform Record */}
                          {userRole === 'ADMIN' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePublication(pub.id)}
                              title="Hapus record publikasi platform ini"
                              className="h-8 w-8 text-danger hover:bg-danger-soft rounded-lg ml-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer Modal */}
              <DialogFooter className="pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setManageModalContentId(null)}
                  className="rounded-lg"
                >
                  Tutup
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. SUB-DIALOG: TANDAI DIPUBLIKASIKAN / UBAH TAUTAN                       */}
      {/* ========================================================================= */}
      <Dialog
        open={publishModal.open}
        onOpenChange={(open) => !saving && setPublishModal({ open, pub: null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-ink flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Catat Data Penayangan
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Masukkan tanggal aktual dan tautan postingan untuk platform{' '}
              <strong className="text-ink font-semibold">
                {publishModal.pub?.platform?.name || 'Platform'}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="pubDate" className="text-xs font-semibold text-ink">
                Tanggal Tayang Aktual *
              </Label>
              <Input
                id="pubDate"
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pubUrl" className="text-xs font-semibold text-ink">
                Tautan / Link Postingan (Opsional)
              </Label>
              <Input
                id="pubUrl"
                type="url"
                value={publishUrl}
                onChange={(e) => setPublishUrl(e.target.value)}
                placeholder="Contoh: https://instagram.com/p/... atau https://facebook.com/..."
                className="text-xs h-9"
              />
              <p className="text-[11px] text-ink-muted">
                Tautan ini dapat diisi sekarang atau diperbarui kembali nanti setelah posting.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pubNotes" className="text-xs font-semibold text-ink">
                Catatan Penayangan (Opsional)
              </Label>
              <Textarea
                id="pubNotes"
                value={publishNotes}
                onChange={(e) => setPublishNotes(e.target.value)}
                placeholder="Tuliskan catatan tambahan mengenai proses penayangan jika ada..."
                rows={2}
                className="text-xs"
              />
            </div>
            {error && <p className="text-xs font-medium text-danger">{error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPublishModal({ open: false, pub: null })}
              disabled={saving}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button
              onClick={handleMarkPublished}
              disabled={saving || !publishDate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Data Penayangan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 7. SUB-DIALOG: BATALKAN PENAYANGAN                                       */}
      {/* ========================================================================= */}
      <Dialog
        open={cancelModal.open}
        onOpenChange={(open) => !saving && setCancelModal({ open, pub: null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-ink flex items-center gap-2 text-rose-600">
              <XCircle className="h-5 w-5" />
              Batalkan Penayangan
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Pembatalan penayangan di platform{' '}
              <strong className="text-ink">
                {cancelModal.pub?.platform?.name || 'Platform'}
              </strong>{' '}
              untuk konten &quot;{cancelModal.pub?.content?.title}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="cancelReason" className="text-xs font-semibold text-ink">
                Alasan Pembatalan *
              </Label>
              <Textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Isu berita mendesak ditunda, materi konten direvisi total, dll."
                rows={3}
                required
                className="text-xs"
              />
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-surface-muted/60 p-3 border border-border">
              <input
                id="moveTabungan"
                type="checkbox"
                checked={cancelMoveToTabungan}
                onChange={(e) => setCancelMoveToTabungan(e.target.checked)}
                className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label
                htmlFor="moveTabungan"
                className="text-xs font-normal cursor-pointer leading-relaxed text-ink-secondary"
              >
                Otomatis simpan ide konten ini ke <strong>Bank Konten</strong> agar dapat
                dimanfaatkan kembali nanti.
              </Label>
            </div>
            {error && <p className="text-xs font-medium text-danger">{error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCancelModal({ open: false, pub: null })}
              disabled={saving}
              className="text-xs h-9"
            >
              Kembali
            </Button>
            <Button
              onClick={handleCancelPublication}
              disabled={saving || !cancelReason.trim()}
              variant="destructive"
              className="text-xs h-9"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Konfirmasi Pembatalan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 8. SUB-DIALOG: REKAM DATA METRIK PERFORMA                                */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(metricsPub)}
        onOpenChange={(open) => !open && !saving && setMetricsPub(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-ink flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-teal-600" />
              Rekam Metrik Performa
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Catat interaksi media sosial untuk platform{' '}
              <strong className="text-ink">
                {metricsPub?.platform?.name || 'Platform'}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMetrics} className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="views" className="text-xs font-medium text-ink">
                  Views (Tayangan)
                </Label>
                <Input
                  id="views"
                  type="number"
                  min="0"
                  value={metricsForm.views}
                  onChange={(e) => setMetricsForm({ ...metricsForm, views: e.target.value })}
                  className="text-xs h-8.5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reach" className="text-xs font-medium text-ink">
                  Reach (Jangkauan)
                </Label>
                <Input
                  id="reach"
                  type="number"
                  min="0"
                  value={metricsForm.reach}
                  onChange={(e) => setMetricsForm({ ...metricsForm, reach: e.target.value })}
                  className="text-xs h-8.5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="likes" className="text-xs font-medium text-ink">
                  Likes (Suka)
                </Label>
                <Input
                  id="likes"
                  type="number"
                  min="0"
                  value={metricsForm.likes}
                  onChange={(e) => setMetricsForm({ ...metricsForm, likes: e.target.value })}
                  className="text-xs h-8.5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="comments" className="text-xs font-medium text-ink">
                  Comments (Komentar)
                </Label>
                <Input
                  id="comments"
                  type="number"
                  min="0"
                  value={metricsForm.comments}
                  onChange={(e) => setMetricsForm({ ...metricsForm, comments: e.target.value })}
                  className="text-xs h-8.5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="shares" className="text-xs font-medium text-ink">
                  Shares (Dibagikan)
                </Label>
                <Input
                  id="shares"
                  type="number"
                  min="0"
                  value={metricsForm.shares}
                  onChange={(e) => setMetricsForm({ ...metricsForm, shares: e.target.value })}
                  className="text-xs h-8.5"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="saves" className="text-xs font-medium text-ink">
                  Saves (Disimpan)
                </Label>
                <Input
                  id="saves"
                  type="number"
                  min="0"
                  value={metricsForm.saves}
                  onChange={(e) => setMetricsForm({ ...metricsForm, saves: e.target.value })}
                  className="text-xs h-8.5"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="recDate" className="text-xs font-medium text-ink">
                Tanggal Pengambilan Data
              </Label>
              <Input
                id="recDate"
                type="date"
                value={metricsForm.recorded_at}
                onChange={(e) => setMetricsForm({ ...metricsForm, recorded_at: e.target.value })}
                className="text-xs h-8.5"
              />
            </div>

            <p className="text-[11px] text-ink-muted bg-surface-muted p-2 rounded-md">
              Rumus: {ENGAGEMENT_FORMULA}
            </p>
            {error && <p className="text-xs font-medium text-danger">{error}</p>}

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMetricsPub(null)}
                disabled={saving}
                className="text-xs h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Metrik
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
