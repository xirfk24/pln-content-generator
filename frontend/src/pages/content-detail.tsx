'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
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
  START_PROGRESS: 'Mulai Dikerjakan',
  SUBMITTED: 'Diajukan untuk Ditinjau',
  REVIEWED: 'Ditinjau',
  REVISION_REQUESTED: 'Diminta Revisi',
  REVIEW_APPROVED: 'Tinjauan Disetujui',
  APPROVED: 'Disetujui',
  FINAL_APPROVED: 'Disetujui Final',
  REJECTED: 'Ditolak',
  RESUBMITTED: 'Diajukan Ulang',
  MARK_PUBLISHED: 'Dipublikasikan',
  SAVED_TO_TABUNGAN: 'Disimpan ke Tabungan',
  RESCHEDULED: 'Dijadwalkan Ulang',
}

export default function ContentDetailPage() {
  const { id } = useParams()
  const [content, setContent] = useState<ContentWithPubs | null>(null)
  const [approvals, setApprovals] = useState<ApprovalHistory[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [tabunganLoading, setTabunganLoading] = useState(false)

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

  async function handleMoveToTabungan() {
    const reason = prompt('Masukkan alasan memindahkan konten ini ke Konten Tabungan (opsional):')
    if (reason === null) return
    setTabunganLoading(true)
    try {
      const res = await apiFetch(`/api/contents/${id}/move-to-tabungan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        load()
      } else {
        const d = await res.json()
        alert(d.error || 'Gagal memindahkan ke tabungan')
      }
    } catch (err) {
      console.error(err)
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

  const isLocked = ['PENDING_REVIEW', 'APPROVED', 'PUBLISHED'].includes(content.status)

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
                Konten Tabungan
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
          {!content.is_savings && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMoveToTabungan}
              disabled={tabunganLoading}
              title="Pindahkan ke Konten Tabungan"
            >
              <BookmarkCheck className="mr-1.5 h-3.5 w-3.5" />
              Simpan ke Tabungan
            </Button>
          )}

          {isLocked ? (
            <Button variant="outline" size="sm" disabled title="Konten sedang terkunci">
              <Lock className="mr-1.5 h-3.5 w-3.5 text-ink-muted" />
              Terkunci
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
              <CardTitle className="text-sm font-semibold">Brief &amp; Naskah Konten</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {content.brief || 'Belum ada brief yang dituliskan.'}
              </p>

              {content.brief_link && (
                <div className="border-t pt-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    Tautan Desain / Dokumen
                  </p>
                  <a
                    href={content.brief_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>{content.brief_link}</span>
                  </a>
                </div>
              )}
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
                  Belum ada record publikasi. Setelah konten berstatus <strong>Disetujui</strong>, sistem akan otomatis membuat record antrean untuk setiap target platform.
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
                {content.status === 'DRAFT' && (
                  <>
                    <WorkflowActionButton
                      contentId={content.id}
                      action="START_PROGRESS"
                      variant="outline"
                      onDone={load}
                    />
                    <WorkflowActionButton
                      contentId={content.id}
                      action="SUBMITTED"
                      onDone={load}
                    />
                  </>
                )}

                {content.status === 'IN_PROGRESS' && (
                  <WorkflowActionButton
                    contentId={content.id}
                    action="SUBMITTED"
                    onDone={load}
                  />
                )}

                {content.status === 'REVISION_REQUIRED' && (
                  <>
                    <WorkflowActionButton
                      contentId={content.id}
                      action="RESUBMITTED"
                      onDone={load}
                    />
                  </>
                )}

                {content.status === 'PENDING_REVIEW' && userRole === 'ADMIN' && (
                  <>
                    <WorkflowActionButton
                      contentId={content.id}
                      action="APPROVED"
                      onDone={load}
                    />
                    <WorkflowActionButton
                      contentId={content.id}
                      action="REVISION_REQUESTED"
                      variant="outline"
                      onDone={load}
                    />
                  </>
                )}

                {content.status === 'PENDING_REVIEW' && userRole !== 'ADMIN' && (
                  <p className="text-xs text-ink-secondary italic p-2 bg-slate-50 rounded dark:bg-slate-900/50">
                    Konten telah diajukan dan sedang menunggu persetujuan dari Admin / Reviewer.
                  </p>
                )}

                {content.status === 'APPROVED' && (
                  <div className="space-y-2">
                    <p className="text-xs text-success font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Konten telah disetujui dan siap dipublikasikan.
                    </p>
                    <Link href="/publishing" className="w-full block">
                      <Button size="sm" className="w-full">
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Buka Antrean Publikasi
                      </Button>
                    </Link>
                  </div>
                )}

                {content.status === 'PUBLISHED' && (
                  <p className="text-xs text-teal-700 font-medium p-2 bg-teal-50 rounded dark:bg-teal-950/30">
                    Siklus alur kerja selesai — konten telah dipublikasikan.
                  </p>
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
    </div>
  )
}
