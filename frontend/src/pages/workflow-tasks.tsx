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
  BarChart3,
  CheckSquare,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { WorkflowActionButton } from '@/components/workflow/workflow-action-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import { PlatformBadge, PlatformCluster } from '@/components/ui/platform-icon'
import type { Content, Publication, PerformanceMetric } from '@/types'

interface TaskGroups {
  drafts: Content[]
  revisions: Content[]
  readyToPublish: Content[]
  submitted: Content[]
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskGroups | null>(null)
  const [loading, setLoading] = useState(true)

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
        setTasks(data)
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

  const groups = [
    {
      key: 'revisions' as const,
      title: 'Perlu Revisi Segera',
      description: 'Reviewer meminta revisi. Perbaiki brief/naskah dan ajukan ulang.',
      icon: AlertCircle,
      iconColor: 'text-warning',
      badgeColor: 'bg-amber-100 text-amber-800',
      items: tasks.revisions,
      actions: (c: Content) => (
        <div className="flex items-center gap-2">
          <Link href={`/content/${c.id}/edit`}>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <FileEdit className="mr-1 h-3.5 w-3.5" />
              Edit Konten
            </Button>
          </Link>
          <WorkflowActionButton
            contentId={c.id}
            action="RESUBMITTED"
            size="sm"
            onDone={loadTasks}
          />
        </div>
      ),
    },
    {
      key: 'drafts' as const,
      title: 'Draf & Dalam Pengerjaan',
      description: 'Konten berstatus draf atau sedang aktif Anda susun.',
      icon: FileEdit,
      iconColor: 'text-primary',
      badgeColor: 'bg-blue-100 text-blue-800',
      items: tasks.drafts,
      actions: (c: Content) => (
        <div className="flex items-center gap-2">
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
      key: 'submitted' as const,
      title: 'Menunggu Persetujuan Reviewer',
      description: 'Konten telah diajukan dan sedang dalam antrean review Admin.',
      icon: Clock,
      iconColor: 'text-purple-600',
      badgeColor: 'bg-purple-100 text-purple-800',
      items: tasks.submitted,
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
      key: 'readyToPublish' as const,
      title: 'Siap Tayang & Rekam Publikasi',
      description: 'Konten telah disetujui. Rekam tanggal aktual publikasi dan URL postingan.',
      icon: CheckCircle2,
      iconColor: 'text-success',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      items: tasks.readyToPublish,
      actions: (c: Content) => (
        <div className="flex items-center gap-2">
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
  ]

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
              Modul ini menampilkan daftar tugas penyusunan konten, perbaikan catatan revisi dari reviewer, dan pencatatan operasional publikasi konten Anda secara terpadu.
            </p>
          </div>
        </div>
      </div>

      {groups.map((group) => (
        <Card key={group.key}>
          <CardHeader className="border-b py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <group.icon className={`h-5 w-5 ${group.iconColor}`} />
                <CardTitle className="text-sm font-semibold">
                  {group.title}
                </CardTitle>
                <Badge variant="secondary" className={`text-xs ${group.badgeColor}`}>
                  {group.items.length}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-ink-secondary mt-0.5">{group.description}</p>
          </CardHeader>
          <CardContent className="p-0">
            {group.items.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-muted">
                Tidak ada tugas di bagian ini.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {group.items.map((content) => (
                  <div
                    key={content.id}
                    className="flex flex-col gap-2 p-4 transition-colors hover:bg-surface-muted/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-ink truncate">
                          {content.title}
                        </p>
                        <PlatformCluster
                          platforms={
                            content.platform_ids && content.platform_ids.length > 0
                              ? content.platform_ids
                              : content.platform?.name
                              ? [content.platform.name]
                              : []
                          }
                          maxDisplay={3}
                        />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
                        <StatusBadge status={content.status} />
                        {content.pillar && (
                          <span className="font-medium text-primary">
                            Pilar: {content.pillar.name}
                          </span>
                        )}
                        {content.topic && (
                          <span className="text-ink">
                            Topik: {content.topic}
                          </span>
                        )}
                        {content.planned_date && <span>Tgl: {formatDate(content.planned_date)}</span>}
                        {content.pic && <span>PIC: {content.pic}</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 pt-2 sm:pt-0">{group.actions(content)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Dialog: Rekam Publikasi dari Tugas Saya */}
      <Dialog open={recordPub.open} onOpenChange={(open) => !savingPub && setRecordPub({ open, content: null, pub: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rekam Publikasi Konten</DialogTitle>
            <DialogDescription>
              Catat data tayang publikasi untuk konten yang telah disetujui.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Sumber Data Otomatis dari Content Plan (Read-Only) */}
            <div className="rounded-lg border bg-slate-50 p-3 text-xs dark:bg-slate-900/30 space-y-2">
              <p className="font-semibold text-ink-secondary uppercase tracking-wider text-[11px]">
                Data Sumber Rencana Konten (Otomatis &amp; Terkunci)
              </p>
              <div className="grid grid-cols-2 gap-2 text-ink">
                <div>
                  <span className="text-ink-muted">Judul:</span>{' '}
                  <span className="font-medium">{recordPub.content?.title}</span>
                </div>
                <div>
                  <span className="text-ink-muted">Platform:</span>{' '}
                  {recordPub.pub?.platform?.name ? (
                    <span className="inline-block align-middle ml-1">
                      <PlatformBadge platform={recordPub.pub.platform.name} size="sm" />
                    </span>
                  ) : (
                    <span className="font-medium">-</span>
                  )}
                </div>
                <div>
                  <span className="text-ink-muted">Tgl Rencana:</span>{' '}
                  <span className="font-medium">{formatDate(recordPub.content?.planned_date)}</span>
                </div>
                <div>
                  <span className="text-ink-muted">Content Pillar:</span>{' '}
                  <span className="font-medium">{recordPub.content?.pillar?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-ink-muted">Topik Konten:</span>{' '}
                  <span className="font-medium">{recordPub.content?.topic || '-'}</span>
                </div>
                <div>
                  <span className="text-ink-muted">PIC:</span>{' '}
                  <span className="font-medium">{recordPub.content?.pic || '-'}</span>
                </div>
              </div>
            </div>

            {/* Field yang Dapat Diisi Operasional Publikasi */}
            <div className="space-y-2">
              <Label htmlFor="actualDate">Tanggal Aktual Publikasi *</Label>
              <Input
                id="actualDate"
                type="date"
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pubUrl">URL Publikasi (Postingan Media Sosial)</Label>
              <Input
                id="pubUrl"
                type="url"
                value={pubUrl}
                onChange={(e) => setPubUrl(e.target.value)}
                placeholder="https://instagram.com/p/... (opsional)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pubNotes">Catatan Publikasi (Opsional)</Label>
              <Textarea
                id="pubNotes"
                value={pubNotes}
                onChange={(e) => setPubNotes(e.target.value)}
                placeholder="Catatan hasil penayangan konten..."
                rows={2}
              />
            </div>

            {pubError && <p className="text-sm font-medium text-danger">{pubError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordPub({ open: false, content: null, pub: null })} disabled={savingPub}>
              Batal
            </Button>
            <Button onClick={handleSavePublication} disabled={savingPub || !actualDate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {savingPub && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Rekam Publikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
