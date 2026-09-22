'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
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
import {
  Loader2,
  Edit,
  ArrowLeft,
  ExternalLink,
  Lock,
  BookmarkCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Link as LinkIcon,
} from 'lucide-react'
import Link from '@/compat/next'
import {
  ENGAGEMENT_FORMULA,
  CONTENT_PURPOSE_LABELS,
  POSTING_CATEGORY_LABELS,
  CONTENT_PRIORITY_LABELS,
  CONTENT_STATUS_LABELS,
} from '@/constants'
import { PlatformBadge, PlatformCluster } from '@/components/ui/platform-icon'
import { formatDate, formatDateTime, calculateEngagementRate } from '@/lib/utils'
import { WorkflowActionButton } from '@/components/workflow/workflow-action-button'
import { AIReviewPanel } from '@/components/ai/ai-review-panel'
import type { Content, Publication, ApprovalHistory, Platform } from '@/types'

type ContentWithPubs = Content & { publications: Publication[] }

const ACTION_LABELS_MAP: Record<string, string> = {
  CREATED: 'Dibuat (Draft)',
  SUBMITTED: 'Diajukan Konsep',
  APPROVED: 'Konsep Disetujui',
  CONCEPT_REVISION_REQUESTED: 'Revisi Konsep Diminta',
  START_PRODUCTION: 'Mulai Produksi Konten',
  PRODUCTION_SUBMITTED: 'Hasil Produksi Disetor',
  PRODUCTION_APPROVED: 'Produksi Disetujui',
  PRODUCTION_REVISION_REQUESTED: 'Revisi Produksi Diminta',
  SHORTCUT_READY: 'Langsung Siap Publikasi',
  MARK_PUBLISHED: 'Dipublikasikan',
  REVISION_FROM_READY: 'Revisi dari Siap Tayang',
  REJECTED: 'Ditolak',
  STATUS_MIGRATED: 'Status Dimigrasi',
  SAVED_TO_TABUNGAN: 'Disimpan ke Bank Konten',
  RESCHEDULED: 'Dijadwalkan Ulang',
  // Legacy
  START_PROGRESS: 'Mulai Dikerjakan',
  REVIEWED: 'Ditinjau',
  REVISION_REQUESTED: 'Diminta Revisi',
  REVIEW_APPROVED: 'Tinjauan Disetujui',
  FINAL_APPROVED: 'Disetujui Final',
  RESUBMITTED: 'Diajukan Ulang',
}

export default function ContentDetailPage() {
  const { id } = useParams()
  const [content, setContent] = useState<ContentWithPubs | null>(null)
  const [approvals, setApprovals] = useState<ApprovalHistory[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [tabunganLoading, setTabunganLoading] = useState(false)
  const [tabunganModalOpen, setTabunganModalOpen] = useState(false)
  const [tabunganReason, setTabunganReason] = useState('')
  const [tabunganError, setTabunganError] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await apiFetch(`/api/contents/${id}/details`)
      if (res.ok) {
        const data = await res.json()
        setContent(data.content)
        setApprovals(data.approvals || [])
      }
    } catch (error) {
      console.error('Failed to load content:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    apiFetch('/api/master-data')
      .then((res) => res.json())
      .then((data) => setPlatforms(data.platforms || []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user?.profile?.role && setUserRole(data.user.profile.role))
      .catch(() => {})
  }, [])

  function openMoveToTabunganModal() {
    setTabunganReason('')
    setTabunganError(null)
    setTabunganModalOpen(true)
  }

  async function handleConfirmMoveToTabungan() {
    setTabunganLoading(true)
    setTabunganError(null)
    try {
      const res = await apiFetch(`/api/contents/${id}/move-to-tabungan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: tabunganReason.trim() }),
      })
      if (res.ok) {
        setTabunganModalOpen(false)
        load()
      } else {
        const d = await res.json()
        setTabunganError(d.error || 'Gagal memindahkan ke Bank Konten')
      }
    } catch (err) {
      console.error(err)
      setTabunganError('Terjadi kesalahan jaringan/server')
    } finally {
      setTabunganLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
        <span className="ml-2 text-sm text-ink-secondary">Memuat rincian konten...</span>
      </div>
    )
  }

  if (!content) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-ink-secondary">Konten tidak ditemukan atau telah dihapus.</p>
          <Link href="/content/planning" className="mt-4 inline-block">
            <Button variant="outline">Kembali ke Rencana Konten</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const isLocked = content.status !== 'DRAFT'

  // Ambil nama-nama platform
  const displayPlatforms: string[] = []
  if (content.platform?.name) displayPlatforms.push(content.platform.name)
  if (content.platform_ids && content.platform_ids.length > 0) {
    content.platform_ids.forEach((pid) => {
      const match = platforms.find((p) => p.id === pid)
      if (match && !displayPlatforms.includes(match.name)) {
        displayPlatforms.push(match.name)
      }
    })
  }

  // Ambil nama-nama content purpose
  const displayPurposes: string[] = []
  if (content.content_purposes && content.content_purposes.length > 0) {
    content.content_purposes.forEach((p) => {
      displayPurposes.push(CONTENT_PURPOSE_LABELS[p] || p)
    })
  } else if (content.content_purpose) {
    displayPurposes.push(CONTENT_PURPOSE_LABELS[content.content_purpose] || content.content_purpose)
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <Link
            href="/content/planning"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Rencana Konten
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {content.title}
          </h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={content.status} />
            {content.is_savings && (
              <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-700">
                <BookmarkCheck className="mr-1 h-3 w-3" />
                Bank Konten
              </Badge>
            )}
            {content.pillar && (
              <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary font-medium">
                Pilar: {content.pillar.name}
              </Badge>
            )}
            {displayPlatforms.map((p) => (
              <PlatformBadge key={p} platform={p} size="sm" />
            ))}
            <Badge variant="outline" className="font-normal">{content.format}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!content.is_savings && content.status !== 'REJECTED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={openMoveToTabunganModal}
              disabled={tabunganLoading}
              title="Pindahkan ke Bank Konten"
            >
              <BookmarkCheck className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
              Simpan ke Bank Konten
            </Button>
          )}

          {isLocked ? (
            <Button variant="outline" size="sm" disabled title="Form edit terkunci untuk status selain DRAFT">
              <Lock className="mr-1.5 h-3.5 w-3.5 text-ink-muted" />
              Form Edit Terkunci
            </Button>
          ) : (
            <Link href={`/content/${content.id}/edit`}>
              <Button size="sm">
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Edit Konten
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Rincian Utama & Brief & Publikasi */}
        <div className="space-y-6 lg:col-span-2">
          {/* Ringkasan Metadata */}
          <Card>
            <CardHeader className="border-b py-3 px-4">
              <CardTitle className="text-sm font-semibold">Ringkasan Informasi</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                  <dt className="text-xs text-ink-secondary">Content Pillar (Pilar Utama)</dt>
                  <dd className="text-sm font-semibold text-primary">{content.pillar?.name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Topik Konten</dt>
                  <dd className="text-sm font-medium text-ink">{content.topic}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Target Platform</dt>
                  <dd className="mt-0.5 flex flex-wrap gap-1">
                    {displayPlatforms.length > 0 ? (
                      displayPlatforms.map((p) => <PlatformBadge key={p} platform={p} size="sm" />)
                    ) : (
                      <span className="text-sm text-ink">-</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">PIC</dt>
                  <dd className="text-sm font-medium text-ink">{content.pic || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Prioritas</dt>
                  <dd className="text-sm font-medium text-ink">
                    {content.priority ? CONTENT_PRIORITY_LABELS[content.priority] || content.priority : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Format Konten</dt>
                  <dd className="text-sm font-medium text-ink">{content.format}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Tanggal Rencana</dt>
                  <dd className="text-sm font-medium text-ink">{formatDate(content.planned_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Minggu / Hari</dt>
                  <dd className="text-sm font-medium text-ink">
                    {content.planned_week ? `W${content.planned_week}` : '-'} {content.day ? `(${content.day})` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Target Audiens</dt>
                  <dd className="text-sm font-medium text-ink">{content.target_audience || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Kategori</dt>
                  <dd className="text-sm font-medium text-ink">{content.category?.name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Kategori Posting</dt>
                  <dd className="text-sm font-medium text-ink">
                    {content.posting_category ? POSTING_CATEGORY_LABELS[content.posting_category] || content.posting_category : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Tujuan Konten</dt>
                  <dd className="text-sm font-medium text-ink">
                    {displayPurposes.length > 0 ? displayPurposes.join(', ') : '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Brief & Tautan */}
          <Card>
            <CardHeader className="border-b py-3 px-4">
              <CardTitle className="text-sm font-semibold">Brief &amp; Tautan Lampiran</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {content.brief || 'Belum ada brief yang dituliskan.'}
              </p>

              <div className="grid gap-4 sm:grid-cols-2 border-t pt-3">
                {content.brief_link && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                      Tautan Google Drive / Canva
                    </p>
                    <a
                      href={content.brief_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline break-all"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      <span>{content.brief_link}</span>
                    </a>
                  </div>
                )}

                {content.production_link && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                      Tautan Hasil Produksi
                    </p>
                    <a
                      href={content.production_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline break-all"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      <span>{content.production_link}</span>
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Review Panel */}
          <Card>
            <CardHeader className="border-b py-3 px-4">
              <CardTitle className="text-sm font-semibold">Evaluasi Kualitas Konten (AI)</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <AIReviewPanel
                content={content.brief || ''}
                platform={displayPlatforms[0] || 'Instagram'}
                targetAudience={content.target_audience}
              />
            </CardContent>
          </Card>

          {/* Daftar Publikasi Terhubung */}
          <Card>
            <CardHeader className="border-b py-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Status Publikasi Multi-Platform</CardTitle>
              <Link href="/publishing" className="text-xs text-primary hover:underline">
                Buka Antrean Publikasi →
              </Link>
            </CardHeader>
            <CardContent className="p-4">
              {!content.publications || content.publications.length === 0 ? (
                <p className="text-sm text-ink-muted py-2">
                  Belum ada record publikasi. Setelah konten berstatus <strong>Siap Publikasi</strong>, sistem akan otomatis membuat record antrean untuk setiap target platform.
                </p>
              ) : (
                <div className="space-y-3">
                  {content.publications.map((pub) => {
                    const metrics = pub.performance_metrics?.[0]
                    const engagement = metrics ? calculateEngagementRate(metrics) : null
                    return (
                      <div key={pub.id} className="rounded-lg border p-3.5 bg-slate-50/40 dark:bg-slate-900/20">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-2">
                            {pub.platform?.name ? (
                              <PlatformBadge platform={pub.platform.name} size="sm" />
                            ) : (
                              <span className="font-semibold text-sm text-ink">Platform</span>
                            )}
                            <StatusBadge status={pub.status} kind="publication" />
                          </div>
                          {pub.url && (
                            <a
                              href={pub.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Buka Postingan
                            </a>
                          )}
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink-secondary md:grid-cols-3">
                          <div>Tgl Rencana: {formatDate(pub.planned_publish_date)}</div>
                          <div>Tgl Aktual: {formatDate(pub.actual_publish_date)}</div>
                          {pub.cancel_reason && (
                            <div className="text-danger font-medium">Alasan Batal: {pub.cancel_reason}</div>
                          )}
                        </div>

                        {metrics && (
                          <div className="mt-3 border-t pt-2.5">
                            <div className="grid grid-cols-3 gap-2 text-xs md:grid-cols-6">
                              <div><span className="text-ink-secondary">Views:</span> {metrics.views.toLocaleString()}</div>
                              <div><span className="text-ink-secondary">Likes:</span> {metrics.likes.toLocaleString()}</div>
                              <div><span className="text-ink-secondary">Comments:</span> {metrics.comments.toLocaleString()}</div>
                              <div><span className="text-ink-secondary">Shares:</span> {metrics.shares.toLocaleString()}</div>
                              <div><span className="text-ink-secondary">Saves:</span> {metrics.saves.toLocaleString()}</div>
                              <div><span className="text-ink-secondary">Reach:</span> {metrics.reach.toLocaleString()}</div>
                            </div>
                            {engagement !== null && (
                              <div className="mt-1.5 text-xs">
                                <span className="font-semibold text-success">
                                  Engagement Rate: {engagement.toFixed(2)}%
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Aksi Alur Kerja & Linimasa Persetujuan */}
        <div className="space-y-6">
          {/* Aksi Workflow */}
          <Card>
            <CardHeader className="border-b py-3 px-4">
              <CardTitle className="text-sm font-semibold">Aksi Alur Kerja</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-col gap-2.5">
                {/* 1. DRAFT */}
                {content.status === 'DRAFT' && (
                  <WorkflowActionButton
                    contentId={content.id}
                    action="SUBMITTED"
                    onDone={load}
                  />
                )}

                {/* 2. PENDING_REVIEW */}
                {content.status === 'PENDING_REVIEW' && (
                  userRole === 'ADMIN' ? (
                    <>
                      <WorkflowActionButton
                        contentId={content.id}
                        action="APPROVED"
                        onDone={load}
                      />
                      <WorkflowActionButton
                        contentId={content.id}
                        action="CONCEPT_REVISION_REQUESTED"
                        variant="outline"
                        onDone={load}
                      />
                      <WorkflowActionButton
                        contentId={content.id}
                        action="SHORTCUT_READY"
                        variant="secondary"
                        onDone={load}
                      />
                      <WorkflowActionButton
                        contentId={content.id}
                        action="REJECTED"
                        variant="destructive"
                        onDone={load}
                      />
                    </>
                  ) : (
                    <p className="text-xs text-ink-secondary italic p-2 bg-slate-50 rounded dark:bg-slate-900/50">
                      Konsep telah diajukan dan sedang menunggu persetujuan dari Admin / Reviewer.
                    </p>
                  )
                )}

                {/* 3. APPROVED */}
                {content.status === 'APPROVED' && (
                  <>
                    <WorkflowActionButton
                      contentId={content.id}
                      action="START_PRODUCTION"
                      onDone={load}
                    />
                    {userRole === 'ADMIN' && (
                      <>
                        <WorkflowActionButton
                          contentId={content.id}
                          action="SHORTCUT_READY"
                          variant="secondary"
                          onDone={load}
                        />
                        <WorkflowActionButton
                          contentId={content.id}
                          action="REJECTED"
                          variant="destructive"
                          onDone={load}
                        />
                      </>
                    )}
                  </>
                )}

                {/* 4. PRODUCTION */}
                {content.status === 'PRODUCTION' && (
                  <>
                    <WorkflowActionButton
                      contentId={content.id}
                      action="PRODUCTION_SUBMITTED"
                      initialProductionLink={content.production_link || ''}
                      onDone={load}
                    />
                    {userRole === 'ADMIN' && (
                      <WorkflowActionButton
                        contentId={content.id}
                        action="REJECTED"
                        variant="destructive"
                        onDone={load}
                      />
                    )}
                  </>
                )}

                {/* 5. PENDING_PRODUCTION_REVIEW */}
                {content.status === 'PENDING_PRODUCTION_REVIEW' && (
                  userRole === 'ADMIN' ? (
                    <>
                      <WorkflowActionButton
                        contentId={content.id}
                        action="PRODUCTION_APPROVED"
                        onDone={load}
                      />
                      <WorkflowActionButton
                        contentId={content.id}
                        action="PRODUCTION_REVISION_REQUESTED"
                        variant="outline"
                        onDone={load}
                      />
                      <WorkflowActionButton
                        contentId={content.id}
                        action="REJECTED"
                        variant="destructive"
                        onDone={load}
                      />
                    </>
                  ) : (
                    <p className="text-xs text-ink-secondary italic p-2 bg-slate-50 rounded dark:bg-slate-900/50">
                      Hasil produksi telah disetor dan sedang menunggu review dari Admin / Reviewer.
                    </p>
                  )
                )}

                {/* 6. READY_TO_PUBLISH */}
                {content.status === 'READY_TO_PUBLISH' && (
                  <>
                    <WorkflowActionButton
                      contentId={content.id}
                      action="MARK_PUBLISHED"
                      onDone={load}
                    />
                    {userRole === 'ADMIN' && (
                      <>
                        <WorkflowActionButton
                          contentId={content.id}
                          action="REVISION_FROM_READY"
                          variant="outline"
                          onDone={load}
                        />
                        <WorkflowActionButton
                          contentId={content.id}
                          action="REJECTED"
                          variant="destructive"
                          onDone={load}
                        />
                      </>
                    )}
                  </>
                )}

                {/* 7. PUBLISHED */}
                {content.status === 'PUBLISHED' && (
                  <p className="text-xs text-teal-700 font-medium p-2 bg-teal-50 rounded dark:bg-teal-950/30">
                    Siklus alur kerja selesai — konten telah dipublikasikan.
                  </p>
                )}

                {/* 8. REJECTED */}
                {content.status === 'REJECTED' && (
                  <p className="text-xs text-rose-700 font-medium p-2 bg-rose-50 rounded dark:bg-rose-950/30">
                    Konten ini telah ditolak secara permanen oleh Admin.
                  </p>
                )}

                {/* 9. REVISION_REQUIRED */}
                {content.status === 'REVISION_REQUIRED' && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                      <p className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                        <AlertCircle className="h-4 w-4" />
                        Memerlukan Revisi
                      </p>
                      {content.latest_comment && (
                        <p className="mt-1.5 font-medium leading-relaxed bg-white/70 dark:bg-black/20 p-2 rounded border border-rose-200/60">
                          {content.latest_comment}
                        </p>
                      )}
                    </div>

                    <Link href={`/content/${content.id}/edit`}>
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        <Edit className="mr-1.5 h-3.5 w-3.5" />
                        Edit / Perbaiki Naskah Konten
                      </Button>
                    </Link>

                    {content.production_link || content.latest_action === 'PRODUCTION_REVISION_REQUESTED' ? (
                      <WorkflowActionButton
                        contentId={content.id}
                        action="PRODUCTION_SUBMITTED"
                        initialProductionLink={content.production_link || ''}
                        onDone={load}
                      />
                    ) : (
                      <WorkflowActionButton
                        contentId={content.id}
                        action="RESUBMITTED"
                        onDone={load}
                      />
                    )}

                    {userRole === 'ADMIN' && (
                      <WorkflowActionButton
                        contentId={content.id}
                        action="REJECTED"
                        variant="destructive"
                        onDone={load}
                      />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Riwayat Alur Kerja / Persetujuan */}
          <Card>
            <CardHeader className="border-b py-3 px-4">
              <CardTitle className="text-sm font-semibold">Riwayat Alur Kerja</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {approvals.length === 0 ? (
                <p className="text-xs text-ink-muted">Belum ada riwayat aktivitas.</p>
              ) : (
                <div className="space-y-4">
                  {approvals.map((ah, idx) => (
                    <div key={ah.id || idx} className="relative pl-5 border-l-2 border-primary/30 pb-3 last:pb-0">
                      <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink">
                          {ACTION_LABELS_MAP[ah.action] || ah.action}
                        </span>
                        <span className="text-ink-muted">{formatDateTime(ah.performed_at)}</span>
                      </div>
                      <p className="text-xs text-ink-secondary mt-0.5">
                        Oleh: {ah.performer?.full_name || ah.performer?.email || 'Sistem'}
                      </p>
                      {ah.comment && (
                        <div className="mt-1.5 rounded bg-surface-muted p-2 text-xs italic text-ink border">
                          &quot;{ah.comment}&quot;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog Pindah ke Bank Konten */}
      <Dialog open={tabunganModalOpen} onOpenChange={setTabunganModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ink">
              <BookmarkCheck className="h-5 w-5 text-indigo-600" />
              Simpan ke Bank Konten
            </DialogTitle>
            <DialogDescription>
              Konten ini akan dipindahkan ke daftar Bank Konten dan dapat dijadwalkan ulang sewaktu-waktu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tabungan-reason" className="text-xs font-semibold text-ink">
                Alasan Penyimpanan ke Bank Konten (Opsional)
              </Label>
              <Textarea
                id="tabungan-reason"
                placeholder="Contoh: Menunggu momen kampanye bulan depan, materi visual perlu disempurnakan..."
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
              onClick={() => setTabunganModalOpen(false)}
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
    </div>
  )
}
