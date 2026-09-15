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
  ExternalLink,
  Pencil,
  Trash2,
  BarChart3,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  BookmarkCheck,
  Calendar,
} from 'lucide-react'
import {
  PUBLICATION_STATUS_LABELS,
  PUBLICATION_STATUS_COLORS,
  ENGAGEMENT_FORMULA,
} from '@/constants'
import { StatusBadge } from '@/components/ui/status-badge'
import { PlatformBadge } from '@/components/ui/platform-icon'
import { Select } from '@/components/ui/select'
import { formatDate, calculateEngagementRate } from '@/lib/utils'
import type { Publication, Content, Platform, PerformanceMetric, UserRole } from '@/types'

interface PublicationRow extends Publication {
  content?: Pick<Content, 'id' | 'title' | 'topic' | 'status' | 'pic'>
}

export default function PublishingPage() {
  const [publications, setPublications] = useState<PublicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Dialog states
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

  const loadPublications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
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
  }, [statusFilter, dateFrom, dateTo])

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

  // Tandai Dipublikasikan
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
        setError(data.error || 'Gagal menandai publikasi')
        return
      }

      setPublishModal({ open: false, pub: null })
      setPublishUrl('')
      setPublishNotes('')
      loadPublications()
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  // Batalkan Publikasi
  async function handleCancelPublication() {
    if (!cancelModal.pub) return
    if (!cancelReason.trim()) {
      setError('Alasan pembatalan wajib diisi!')
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
        setError(data.error || 'Gagal membatalkan publikasi')
        return
      }

      // Opsi: Pindahkan juga konten induk ke Konten Tabungan
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
      loadPublications()
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  // Pindahkan Konten Delay ke Konten Tabungan
  async function handleMoveDelayToTabungan(pub: PublicationRow) {
    if (!pub.content_id) return
    if (!confirm('Pindahkan konten tertunda ini ke Konten Tabungan agar dapat dijadwalkan ulang di masa mendatang?')) return
    try {
      const res = await apiFetch(`/api/contents/${pub.content_id}/move-to-tabungan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: `Publikasi tertunda (jadwal rencana: ${pub.planned_publish_date})`,
        }),
      })
      if (res.ok) {
        loadPublications()
      }
    } catch (err) {
      console.error(err)
    }
  }

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
        setError(data.error || 'Gagal menyimpan metrik')
        return
      }

      setMetricsPub(null)
      loadPublications()
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus record publikasi ini?')) return
    try {
      await apiFetch(`/api/publications/${id}`, { method: 'DELETE' })
      loadPublications()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner Penjelasan Modul Konsisten */}
      <div className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50/90 to-blue-50/70 p-4.5 shadow-xs dark:border-teal-900/50 dark:from-teal-950/30 dark:to-blue-950/20">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs">
            <Send className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-teal-950 dark:text-teal-300">
              Antrean Publikasi
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Modul ini digunakan untuk memantau status tayang, mengelola jadwal, mencatat URL publikasi setelah tayang, dan merekam metrik performa media sosial. Status publikasi ditentukan secara otomatis berdasarkan aksi dan tenggat waktu.
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Quick Period Selector */}
      <Card>
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={!dateFrom && !dateTo ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-xs"
            >
              Semua Waktu
            </Button>
            {[
              { label: 'Bulan Ini', fn: () => { const now = new Date(); selectMonth(now.getFullYear(), now.getMonth() + 1) } },
              { label: 'Bulan Lalu', fn: () => { const now = new Date(); selectMonth(now.getFullYear(), now.getMonth()) } },
            ].map((b) => (
              <Button key={b.label} variant="outline" size="sm" onClick={b.fn} className="text-xs">
                {b.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36 text-xs"
                title="Dari Tanggal"
              />
              <span className="text-ink-muted text-xs">s/d</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36 text-xs"
                title="Sampai Tanggal"
              />
            </div>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48 text-xs"
            >
              <option value="">Semua Status Publikasi</option>
              <option value="PLANNED">Direncanakan (Planned)</option>
              <option value="PUBLISHED">Dipublikasikan (Published)</option>
              <option value="DELAYED">Tertunda (Delay)</option>
              <option value="CANCELLED">Dibatalkan (Cancel)</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabel Publikasi */}
      {loading ? (
        <Card>
          <div className="flex items-center justify-center border-b border-border py-4">
            <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
            <span className="ml-2 text-sm text-ink-secondary">Memuat data publikasi...</span>
          </div>
        </Card>
      ) : publications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-ink-secondary">
            Tidak ada record publikasi yang sesuai filter. Konten yang disetujui akan otomatis masuk ke antrean ini.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-surface-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary">Konten Terkait</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary">Tgl Rencana</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary">Tgl Aktual</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary">URL Publikasi</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-secondary">Aksi Publikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {publications.map((pub) => {
                  const isDelay = pub.status === 'DELAYED' || pub.status === 'DELAY'
                  const isPublished = pub.status === 'PUBLISHED'
                  const isCancelled = pub.status === 'CANCELLED' || pub.status === 'CANCEL'

                  return (
                    <tr key={pub.id} className="transition-colors hover:bg-surface-muted/60">
                      <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap text-ink">
                        {pub.platform?.name ? (
                          <PlatformBadge platform={pub.platform.name} size="sm" />
                        ) : (
                          <span className="text-ink-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-xs">
                        {pub.content ? (
                          <Link href={`/content/${pub.content.id}`} className="font-medium text-ink hover:text-primary line-clamp-2">
                            {pub.content.title}
                          </Link>
                        ) : (
                          <span className="text-ink-muted">-</span>
                        )}
                        {pub.content?.topic && (
                          <div className="text-xs text-ink-muted">{pub.content.topic}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-ink-secondary">
                        {formatDate(pub.planned_publish_date)}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-ink-secondary">
                        {formatDate(pub.actual_publish_date)}
                      </td>
                      <td className="px-4 py-3 text-sm max-w-[200px] truncate">
                        {pub.url ? (
                          <a
                            href={pub.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-primary hover:underline text-xs"
                            title={pub.url}
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{pub.url}</span>
                          </a>
                        ) : (
                          <span className="text-ink-muted text-xs italic">Belum diisi</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <StatusBadge status={pub.status} kind="publication" />
                        {pub.cancel_reason && (
                          <div className="text-[11px] text-danger mt-0.5 max-w-xs truncate" title={pub.cancel_reason}>
                            Alasan: {pub.cancel_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Aksi Tandai Dipublikasikan jika belum published */}
                          {!isPublished && !isCancelled && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setPublishModal({ open: true, pub })
                                setPublishDate(new Date().toISOString().split('T')[0])
                                setPublishUrl(pub.url || '')
                                setPublishNotes(pub.notes || '')
                              }}
                              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Tandai Tayang
                            </Button>
                          )}

                          {/* Jika status Delay: tawarkan pindah ke Konten Tabungan */}
                          {isDelay && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMoveDelayToTabungan(pub)}
                              className="text-xs h-8 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                              title="Pindahkan ke Konten Tabungan"
                            >
                              <BookmarkCheck className="mr-1 h-3.5 w-3.5" />
                              Ke Tabungan
                            </Button>
                          )}

                          {/* Aksi Batalkan Publikasi (Admin/Authorized) */}
                          {!isPublished && !isCancelled && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCancelModal({ open: true, pub })
                                setCancelReason('')
                                setCancelMoveToTabungan(true)
                              }}
                              className="text-xs h-8 text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              Batalkan
                            </Button>
                          )}

                          {/* Aksi Catat Performa */}
                          {isPublished && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openMetrics(pub)}
                              className="text-xs h-8"
                              title="Rekam Data Performa (Views, Likes, dll)"
                            >
                              <BarChart3 className="mr-1 h-3.5 w-3.5" />
                              Metrik
                            </Button>
                          )}

                          {userRole === 'ADMIN' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(pub.id)}
                              title="Hapus record publikasi"
                              className="h-8 w-8 text-danger hover:bg-danger-soft"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dialog: Tandai Dipublikasikan */}
      <Dialog open={publishModal.open} onOpenChange={(open) => !saving && setPublishModal({ open, pub: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tandai Konten Telah Dipublikasikan</DialogTitle>
            <DialogDescription>
              Catat waktu aktual penayangan dan URL postingan media sosial untuk &quot;{publishModal.pub?.content?.title}&quot; ({publishModal.pub?.platform?.name}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pubDate">Tanggal Aktual Publikasi *</Label>
              <Input
                id="pubDate"
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pubUrl">URL Publikasi (Opsional)</Label>
              <Input
                id="pubUrl"
                type="url"
                value={publishUrl}
                onChange={(e) => setPublishUrl(e.target.value)}
                placeholder="https://instagram.com/p/... atau link media sosial"
              />
              <p className="text-[11px] text-ink-muted">
                Dapat diisi sekarang atau diperbarui nanti setelah link tersedia.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pubNotes">Catatan Publikasi (Opsional)</Label>
              <Textarea
                id="pubNotes"
                value={publishNotes}
                onChange={(e) => setPublishNotes(e.target.value)}
                placeholder="Catatan tambahan seputar penayangan..."
                rows={2}
              />
            </div>
            {error && <p className="text-sm font-medium text-danger">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishModal({ open: false, pub: null })} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleMarkPublished} disabled={saving || !publishDate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Publikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Batalkan Publikasi */}
      <Dialog open={cancelModal.open} onOpenChange={(open) => !saving && setCancelModal({ open, pub: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan Publikasi Konten</DialogTitle>
            <DialogDescription>
              Wajib menyertakan alasan pembatalan publikasi untuk &quot;{cancelModal.pub?.content?.title}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cancelReason">Alasan Pembatalan *</Label>
              <Textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Tuliskan alasan mengapa publikasi dibatalkan atau ditunda..."
                rows={3}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="moveTabungan"
                type="checkbox"
                checked={cancelMoveToTabungan}
                onChange={(e) => setCancelMoveToTabungan(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="moveTabungan" className="text-xs font-normal cursor-pointer">
                Otomatis simpan konten ini ke <strong>Konten Tabungan</strong> agar dapat dimanfaatkan kembali nanti
              </Label>
            </div>
            {error && <p className="text-sm font-medium text-danger">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModal({ open: false, pub: null })} disabled={saving}>
              Tutup
            </Button>
            <Button onClick={handleCancelPublication} disabled={saving || !cancelReason.trim()} variant="destructive">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Konfirmasi Pembatalan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Rekam Data Metrik */}
      <Dialog open={!!metricsPub} onOpenChange={(open) => !open && !saving && setMetricsPub(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rekam Metrik Performa Publikasi</DialogTitle>
            <DialogDescription>
              Performa konten &quot;{metricsPub?.content?.title}&quot; di platform {metricsPub?.platform?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMetrics} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="views">Views (Tayangan)</Label>
                <Input
                  id="views"
                  type="number"
                  min="0"
                  value={metricsForm.views}
                  onChange={(e) => setMetricsForm({ ...metricsForm, views: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reach">Reach (Jangkauan)</Label>
                <Input
                  id="reach"
                  type="number"
                  min="0"
                  value={metricsForm.reach}
                  onChange={(e) => setMetricsForm({ ...metricsForm, reach: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="likes">Likes (Suka)</Label>
                <Input
                  id="likes"
                  type="number"
                  min="0"
                  value={metricsForm.likes}
                  onChange={(e) => setMetricsForm({ ...metricsForm, likes: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comments">Comments (Komentar)</Label>
                <Input
                  id="comments"
                  type="number"
                  min="0"
                  value={metricsForm.comments}
                  onChange={(e) => setMetricsForm({ ...metricsForm, comments: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shares">Shares (Dibagikan)</Label>
                <Input
                  id="shares"
                  type="number"
                  min="0"
                  value={metricsForm.shares}
                  onChange={(e) => setMetricsForm({ ...metricsForm, shares: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="saves">Saves (Disimpan)</Label>
                <Input
                  id="saves"
                  type="number"
                  min="0"
                  value={metricsForm.saves}
                  onChange={(e) => setMetricsForm({ ...metricsForm, saves: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="recDate">Tanggal Pengambilan Data</Label>
              <Input
                id="recDate"
                type="date"
                value={metricsForm.recorded_at}
                onChange={(e) => setMetricsForm({ ...metricsForm, recorded_at: e.target.value })}
              />
            </div>

            <p className="text-[11px] text-ink-muted">{ENGAGEMENT_FORMULA}</p>
            {error && <p className="text-sm font-medium text-danger">{error}</p>}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setMetricsPub(null)} disabled={saving}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
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
