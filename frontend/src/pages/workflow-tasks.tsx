'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback } from 'react'
import Link from '@/compat/next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Eye,
  FileEdit,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  ExternalLink,
  CheckSquare,
  Wrench,
  Globe,
  XCircle,
  RotateCcw,
  Layers,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { WorkflowActionButton } from '@/components/workflow/workflow-action-button'
import { Badge } from '@/components/ui/badge'
import type { Content, Publication } from '@/types'

interface TaskGroups {
  revisions: Content[]
  drafts: Content[]
  pendingApproval: Content[]
  production: Content[]
  readyToPublish: Content[]
  published: Content[]
  rejected: Content[]
}

type TaskTab = 'ALL' | 'REVISION' | 'DRAFT' | 'PENDING' | 'PRODUCTION' | 'READY' | 'PUBLISHED'

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskGroups | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TaskTab>('ALL')

  // Record publication dialog state
  const [recordPub, setRecordPub] = useState<{
    open: boolean
    content: Content | null
    pub: Publication | null
  }>({
    open: false,
    content: null,
    pub: null,
  })
  const [actualDate, setActualDate] = useState(new Date().toISOString().split('T')[0])
  const [pubUrl, setPubUrl] = useState('')
  const [pubNotes, setPubNotes] = useState('')
  const [savingPub, setSavingPub] = useState(false)
  const [pubError, setPubError] = useState<string | null>(null)

  const loadTasks = useCallback(async () => {
    try {
      const res = await apiFetch('/api/workflow/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks({
          revisions: data.revisions || [],
          drafts: data.drafts || [],
          pendingApproval: data.pendingApproval || [],
          production: data.production || [],
          readyToPublish: data.readyToPublish || [],
          published: data.published || [],
          rejected: data.rejected || [],
        })
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  async function handleSavePublication() {
    if (!recordPub.pub) return
    setSavingPub(true)
    setPubError(null)

    try {
      const res = await apiFetch(`/api/publications/${recordPub.pub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_publish_date: actualDate,
          url: pubUrl ? pubUrl.trim() : null,
          status: 'PUBLISHED',
          notes: pubNotes ? pubNotes.trim() : null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setPubError(data.error || 'Gagal menyimpan rekam publikasi')
        return
      }

      setRecordPub({ open: false, content: null, pub: null })
      setPubUrl('')
      setPubNotes('')
      loadTasks()
    } catch {
      setPubError('Terjadi kesalahan jaringan.')
    } finally {
      setSavingPub(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
        <span className="ml-2 text-sm text-ink-secondary">Memuat daftar tugas...</span>
      </div>
    )
  }

  if (!tasks) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-ink-secondary">
          Gagal memuat data tugas Anda. Silakan refresh halaman.
        </CardContent>
      </Card>
    )
  }

  const allCount =
    tasks.revisions.length +
    tasks.drafts.length +
    tasks.pendingApproval.length +
    tasks.production.length +
    tasks.readyToPublish.length +
    tasks.published.length

  const groups = [
    {
      key: 'revisions' as const,
      tab: 'REVISION' as const,
      title: 'Perlu Revisi',
      description: 'Konten memerlukan perbaikan sesuai arahan dan catatan evaluasi dari Reviewer/Admin.',
      icon: RotateCcw,
      iconColor: 'text-rose-600',
      chip: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/50 dark:border-rose-900/60 dark:text-rose-300',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300',
      items: tasks.revisions,
      actions: (c: Content) => (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/content/${c.id}`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <Eye className="mr-1 h-3.5 w-3.5" />
              Detail
            </Button>
          </Link>
          <Link href={`/content/${c.id}/edit`}>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <FileEdit className="mr-1 h-3.5 w-3.5" />
              Perbaiki Konten
            </Button>
          </Link>
          {c.production_link || c.latest_action === 'PRODUCTION_REVISION_REQUESTED' ? (
            <WorkflowActionButton
              contentId={c.id}
              action="PRODUCTION_SUBMITTED"
              initialProductionLink={c.production_link || ''}
              size="sm"
              onDone={loadTasks}
            />
          ) : (
            <WorkflowActionButton
              contentId={c.id}
              action="RESUBMITTED"
              size="sm"
              onDone={loadTasks}
            />
          )}
        </div>
      ),
    },
    {
      key: 'drafts' as const,
      tab: 'DRAFT' as const,
      title: 'Draft Konsep',
      description: 'Konten dalam tahap awal pembuatan naskah/brief yang belum diajukan ke reviewer.',
      icon: FileEdit,
      iconColor: 'text-primary',
      chip: 'bg-primary-soft text-primary border-primary/20 dark:bg-primary/10 dark:border-primary/20',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
      items: tasks.drafts,
      actions: (c: Content) => (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/content/${c.id}`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <Eye className="mr-1 h-3.5 w-3.5" />
              Lihat
            </Button>
          </Link>
          <Link href={`/content/${c.id}/edit`}>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <FileEdit className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <WorkflowActionButton
            contentId={c.id}
            action="SUBMITTED"
            size="sm"
            onDone={loadTasks}
          />
        </div>
      ),
    },
    {
      key: 'pendingApproval' as const,
      tab: 'PENDING' as const,
      title: 'Menunggu Persetujuan',
      description: 'Konten sedang dalam proses review oleh Admin (persetujuan konsep atau review produksi).',
      icon: Clock,
      iconColor: 'text-purple-600',
      chip: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/50 dark:border-purple-900/60 dark:text-purple-300',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
      items: tasks.pendingApproval,
      actions: (c: Content) => (
        <Link href={`/content/${c.id}`}>
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            <Eye className="mr-1 h-3.5 w-3.5" />
            Lihat Status
          </Button>
        </Link>
      ),
    },
    {
      key: 'production' as const,
      tab: 'PRODUCTION' as const,
      title: 'Produksi Konten',
      description: 'Konsep telah disetujui. Buat materi visual/media dan setor tautan hasil produksi.',
      icon: Wrench,
      iconColor: 'text-amber-600',
      chip: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/50 dark:border-amber-900/60 dark:text-amber-300',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      items: tasks.production,
      actions: (c: Content) => (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/content/${c.id}`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <Eye className="mr-1 h-3.5 w-3.5" />
              Detail
            </Button>
          </Link>
          {c.status === 'APPROVED' && (
            <WorkflowActionButton
              contentId={c.id}
              action="START_PRODUCTION"
              size="sm"
              onDone={loadTasks}
            />
          )}
          {c.status === 'PRODUCTION' && (
            <WorkflowActionButton
              contentId={c.id}
              action="PRODUCTION_SUBMITTED"
              initialProductionLink={c.production_link || ''}
              size="sm"
              onDone={loadTasks}
            />
          )}
        </div>
      ),
    },
    {
      key: 'readyToPublish' as const,
      tab: 'READY' as const,
      title: 'Siap Tayang & Rekam Publikasi',
      description: 'Konten telah disetujui penuh. Rekam tanggal publikasi dan tautan postingan.',
      icon: CheckCircle2,
      iconColor: 'text-success',
      chip: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-900/60 dark:text-emerald-300',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      items: tasks.readyToPublish,
      actions: (c: Content) => (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/content/${c.id}`}>
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              <Eye className="mr-1 h-3.5 w-3.5" />
              Detail
            </Button>
          </Link>
          {c.publications && c.publications.length > 0 ? (
            <Button
              size="sm"
              onClick={() => {
                setRecordPub({
                  open: true,
                  content: c,
                  pub: c.publications![0],
                })
                setActualDate(new Date().toISOString().split('T')[0])
                setPubUrl(c.publications![0].url || '')
                setPubNotes(c.publications![0].notes || '')
              }}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="mr-1 h-3.5 w-3.5" />
              Rekam Publikasi
            </Button>
          ) : (
            <Link href="/publishing">
              <Button size="sm" className="h-8 text-xs">
                Antrean Publikasi
              </Button>
            </Link>
          )}
        </div>
      ),
    },
    {
      key: 'published' as const,
      tab: 'PUBLISHED' as const,
      title: 'Dipublikasikan',
      description: 'Konten yang sudah berhasil ditayangkan pada platform sasaran.',
      icon: Globe,
      iconColor: 'text-teal-600',
      chip: 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-950/50 dark:border-teal-900/60 dark:text-teal-300',
      badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
      items: tasks.published,
      actions: (c: Content) => (
        <Link href={`/content/${c.id}`}>
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            <Eye className="mr-1 h-3.5 w-3.5" />
            Detail Post
          </Button>
        </Link>
      ),
    },
  ]

  // Filter groups according to activeTab
  const visibleGroups = activeTab === 'ALL'
    ? groups
    : groups.filter((g) => g.tab === activeTab)

  return (
    <div className="space-y-6">
      {/* Banner Penjelasan Modul Konsisten */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 p-4.5 shadow-xs dark:border-blue-900/50 dark:from-blue-950/30 dark:to-indigo-950/20">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1A3A6B] text-white shadow-xs">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#1A3A6B] dark:text-blue-300">
              Tugas Saya
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Modul ini menampilkan daftar tugas penyusunan konten, perbaikan revisi, tahap produksi aset, dan pencatatan publikasi Anda.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigasi Horizontal — selalu satu baris (tanpa wrap) */}
      <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto border-b border-border pb-3 [scrollbar-width:thin]">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${activeTab === 'ALL'
              ? 'bg-[#1A3A6B] text-white shadow-xs'
              : 'bg-surface text-ink-secondary hover:bg-surface-muted hover:text-ink border border-border'
            }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Semua Tugas
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === 'ALL'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
          >
            {allCount}
          </span>
        </button>

        {/* Tab Perlu Revisi (Standout dengan badge merah/oranye) */}
        <button
          type="button"
          onClick={() => setActiveTab('REVISION')}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${activeTab === 'REVISION'
              ? 'bg-rose-600 text-white shadow-xs'
              : tasks.revisions.length > 0
                ? 'border-2 border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                : 'bg-surface text-ink-secondary hover:bg-surface-muted hover:text-ink border border-border'
            }`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Perlu Revisi
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === 'REVISION'
                ? 'bg-white/20 text-white'
                : tasks.revisions.length > 0
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
          >
            {tasks.revisions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('DRAFT')}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${activeTab === 'DRAFT'
              ? 'bg-[#1A3A6B] text-white shadow-xs'
              : 'bg-surface text-ink-secondary hover:bg-surface-muted hover:text-ink border border-border'
            }`}
        >
          <FileEdit className="h-3.5 w-3.5" />
          Draft Konsep
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === 'DRAFT'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
          >
            {tasks.drafts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${activeTab === 'PENDING'
              ? 'bg-[#1A3A6B] text-white shadow-xs'
              : 'bg-surface text-ink-secondary hover:bg-surface-muted hover:text-ink border border-border'
            }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Menunggu Persetujuan
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === 'PENDING'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
          >
            {tasks.pendingApproval.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PRODUCTION')}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${activeTab === 'PRODUCTION'
              ? 'bg-[#1A3A6B] text-white shadow-xs'
              : 'bg-surface text-ink-secondary hover:bg-surface-muted hover:text-ink border border-border'
            }`}
        >
          <Wrench className="h-3.5 w-3.5" />
          Produksi Konten
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === 'PRODUCTION'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
          >
            {tasks.production.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('READY')}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${activeTab === 'READY'
              ? 'bg-[#1A3A6B] text-white shadow-xs'
              : 'bg-surface text-ink-secondary hover:bg-surface-muted hover:text-ink border border-border'
            }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Siap Tayang
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === 'READY'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
          >
            {tasks.readyToPublish.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PUBLISHED')}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${activeTab === 'PUBLISHED'
              ? 'bg-[#1A3A6B] text-white shadow-xs'
              : 'bg-surface text-ink-secondary hover:bg-surface-muted hover:text-ink border border-border'
            }`}
        >
          <Globe className="h-3.5 w-3.5" />
          Selesai
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === 'PUBLISHED'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
          >
            {tasks.published.length}
          </span>
        </button>
      </div>

      {/* Render Groups Berdasarkan Tab Aktif */}
      <div className="space-y-6">
        {visibleGroups.map((group) => {
          // Jika tab ALL dan group kosong, sembunyikan agar rapi
          if (activeTab === 'ALL' && group.items.length === 0) return null

          return (
            <Card key={group.key} className={group.key === 'revisions' ? 'border-rose-300 dark:border-rose-900/60 shadow-xs' : ''}>
              <CardHeader className="border-b py-3.5 px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${group.chip}`} aria-hidden="true">
                      <group.icon className="h-4 w-4" />
                    </span>
                    <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                      <CardTitle className={`text-base font-bold tracking-tight rounded-md px-2.5 py-1 ${group.badgeColor}`}>
                        {group.title}
                      </CardTitle>
                      <Badge variant="secondary" className={`text-[11px] font-semibold px-2 ${group.badgeColor}`}>
                        {group.items.length}
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">{group.description}</p>
              </CardHeader>
              <CardContent className="p-0">
                {group.items.length === 0 ? (
                  <p className="py-8 text-center text-xs text-ink-muted">
                    Tidak ada tugas di kategori ini.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {group.items.map((content, idx) => (
                      <div
                        key={content.id}
                        className={`flex flex-col gap-3 p-4 sm:px-5 transition-colors ${
                          // Zebra striping: baris genap diberi shade tipis;
                          // kategori Perlu Revisi tetap pakai tint merahnya.
                          group.key === 'revisions'
                            ? 'bg-rose-50/20 dark:bg-rose-950/10'
                            : idx % 2 === 1
                              ? 'bg-slate-50/70 dark:bg-slate-900/30'
                              : ''
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            {/* Nomor urut item dalam grup — biar gampang dipindai */}
                            <span
                              aria-hidden="true"
                              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${group.chip}`}
                            >
                              {idx + 1}
                            </span>
                            <div className="space-y-1.5 min-w-0">
                              <Link
                                href={`/content/${content.id}`}
                                className="block text-sm font-semibold leading-snug text-ink hover:text-primary transition-colors"
                              >
                                {content.title}
                              </Link>
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-muted">
                                {content.pillar?.name && (
                                  <span>
                                    Pilar: <strong className="font-semibold text-ink-secondary">{content.pillar.name}</strong>
                                  </span>
                                )}
                                <span>
                                  Format: <strong className="font-semibold text-ink-secondary">{content.format}</strong>
                                </span>
                                {content.planned_date && (
                                  <span className="inline-flex items-center gap-x-2.5">
                                    <span aria-hidden="true" className="h-0.5 w-0.5 rounded-full bg-ink-muted/60" />
                                    Target: <strong className="font-semibold text-ink-secondary">{formatDate(content.planned_date)}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">{group.actions(content)}</div>
                        </div>

                        {/* Catatan Revisi untuk kategori Perlu Revisi */}
                        {group.key === 'revisions' && (
                          <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-950 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                            <div className="flex items-start gap-2.5">
                              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                              <div className="space-y-0.5 min-w-0">
                                <p className="font-bold text-rose-800 dark:text-rose-300">
                                  Catatan Revisi dari Reviewer / Admin:
                                </p>
                                <p className="font-medium text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
                                  {content.latest_comment || 'Konten ini memerlukan perbaikan. Silakan periksa naskah/aset dan ajukan kembali.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Catatan / Feedback Terakhir untuk kategori selain Revisi jika ada */}
                        {group.key !== 'revisions' && content.latest_comment && (
                          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">Catatan/Feedback Terakhir:</span>
                              <span className="text-slate-600 dark:text-slate-400 truncate">{content.latest_comment}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Dialog Rekam Publikasi */}
      <Dialog
        open={recordPub.open}
        onOpenChange={(open) => !open && setRecordPub({ open: false, content: null, pub: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rekam Hasil Publikasi</DialogTitle>
            <DialogDescription>
              Catat tanggal penayangan aktual dan tautan postingan yang telah terbit.
            </DialogDescription>
          </DialogHeader>

          {recordPub.content && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs text-ink-secondary">Judul Konten</Label>
                <p className="font-semibold text-sm text-ink">{recordPub.content.title}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actual-date">Tanggal Publikasi Aktual *</Label>
                <Input
                  id="actual-date"
                  type="date"
                  value={actualDate}
                  onChange={(e) => setActualDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pub-url">Tautan Postingan (URL)</Label>
                <Input
                  id="pub-url"
                  type="url"
                  placeholder="https://instagram.com/p/..."
                  value={pubUrl}
                  onChange={(e) => setPubUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pub-notes">Catatan / Keterangan Tambahan</Label>
                <Textarea
                  id="pub-notes"
                  placeholder="Keterangan mengenai postingan..."
                  value={pubNotes}
                  onChange={(e) => setPubNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {pubError && (
                <p className="text-sm font-medium text-danger">{pubError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRecordPub({ open: false, content: null, pub: null })}
              disabled={savingPub}
            >
              Batal
            </Button>
            <Button onClick={handleSavePublication} disabled={savingPub}>
              {savingPub && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Simpan Rekam Publikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
