'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PlatformBadge, PlatformCluster } from '@/components/ui/platform-icon'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  BookmarkCheck,
  Search,
  Calendar,
  ArrowRight,
  Clock,
  Trash2,
  Eye,
  Loader2,
  RefreshCw,
  PlusCircle,
  AlertCircle,
} from 'lucide-react'
import Link from '@/compat/next'
import { formatDate } from '@/lib/utils'
import { SkeletonTable } from '@/components/ui/skeleton'
import type { Content, Pillar, Category, Platform } from '@/types'

export default function ContentTabunganPage() {
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pillarFilter, setPillarFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])

  // Modal dialog states
  const [moveModal, setMoveModal] = useState<{ open: boolean; content: Content | null }>({
    open: false,
    content: null,
  })
  const [moveDate, setMoveDate] = useState('')
  const [moveReason, setMoveReason] = useState('')

  const [rescheduleModal, setRescheduleModal] = useState<{ open: boolean; content: Content | null }>({
    open: false,
    content: null,
  })
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleToPlan, setRescheduleToPlan] = useState(true)
  const [rescheduleReason, setRescheduleReason] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (pillarFilter) params.set('pillar_id', pillarFilter)
      if (categoryFilter) params.set('category_id', categoryFilter)
      if (monthFilter) params.set('month', monthFilter)

      const res = await apiFetch(`/api/tabungan?${params.toString()}`)
      const data = await res.json()
      setContents(data.contents || [])
    } catch (err) {
      console.error('Failed to load tabungan contents:', err)
    } finally {
      setLoading(false)
    }
  }, [search, pillarFilter, categoryFilter, monthFilter])

  useEffect(() => {
    apiFetch('/api/master-data')
      .then((res) => res.json())
      .then((data) => {
        setPillars(data.pillars || [])
        setCategories(data.categories || [])
        setPlatforms(data.platforms || [])
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleMoveToPlan() {
    if (!moveModal.content) return
    setSaving(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/tabungan/${moveModal.content.id}/move-to-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planned_date: moveDate || undefined,
          reason: moveReason || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal memindahkan konten ke Rencana Konten')
        return
      }
      setMoveModal({ open: false, content: null })
      setMoveDate('')
      setMoveReason('')
      loadData()
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReschedule() {
    if (!rescheduleModal.content || !rescheduleDate) {
      setError('Tanggal publikasi baru wajib dipilih')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/tabungan/${rescheduleModal.content.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planned_date: rescheduleDate,
          to_plan: rescheduleToPlan,
          reason: rescheduleReason || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal menjadwalkan ulang konten')
        return
      }
      setRescheduleModal({ open: false, content: null })
      setRescheduleDate('')
      setRescheduleReason('')
      loadData()
    } catch {
      setError('Terjadi kesalahan jaringan.')
    } finally {
      setSaving(false)
    }
  }

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Content | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openDeleteModal(content: Content) {
    setDeleteTarget(content)
    setDeleteError(null)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const res = await apiFetch(`/api/contents/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteTarget(null)
        loadData()
      } else {
        const d = await res.json()
        setDeleteError(d.error || 'Gagal menghapus konten.')
      }
    } catch (err) {
      console.error(err)
      setDeleteError('Terjadi kesalahan jaringan.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const hasFilters = search || pillarFilter || categoryFilter || monthFilter

  return (
    <div className="space-y-6">
      {/* Banner Penjelasan Modul Konsisten */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 to-blue-50/70 p-4.5 shadow-xs dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-blue-950/20">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <BookmarkCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-indigo-950 dark:text-indigo-300">
              Konten Tabungan
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Modul ini digunakan untuk menampung konten yang sudah direncanakan atau disetujui, belum sempat dipublikasikan, ditunda, atau dibatalkan dari antrean namun tetap relevan untuk digunakan pada waktu berikutnya.
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Pencarian */}
      <Card>
        <div className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                placeholder="Cari konten tabungan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full sm:w-44"
                title="Filter Bulan Disimpan"
              />
              <Select
                value={pillarFilter}
                onChange={(e) => setPillarFilter(e.target.value)}
                className="w-full sm:w-44"
              >
                <option value="">Semua Pilar Konten</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-40"
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabel Data Konten Tabungan */}
      {loading ? (
        <Card>
          <div className="flex items-center justify-center border-b border-border py-4">
            <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
            <span className="ml-2 text-sm text-ink-secondary">Memuat daftar konten tabungan...</span>
          </div>
          <div className="p-4">
            <SkeletonTable rows={5} cols={5} />
          </div>
        </Card>
      ) : contents.length === 0 ? (
        <EmptyState
          icon={BookmarkCheck}
          title="Tidak ada konten dalam tabungan"
          description={
            hasFilters
              ? 'Tidak ditemukan konten tabungan yang sesuai dengan filter.'
              : 'Konten yang ditunda atau disimpan dari Antrean Publikasi akan muncul di sini.'
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-surface-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary">Pilar &amp; Kategori</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary">Topik &amp; Judul Konten</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary">Target Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary">Alasan Tabungan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary">PIC</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-secondary">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contents.map((content) => {
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

                  return (
                    <tr key={content.id} className="transition-colors hover:bg-surface-muted/60">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="font-semibold text-primary">{content.pillar?.name || '-'}</div>
                        <div className="text-xs text-ink-muted">{content.category?.name || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-sm">
                        <Link href={`/content/${content.id}`} className="font-medium text-ink hover:text-primary line-clamp-2">
                          {content.title}
                        </Link>
                        <div className="text-xs text-ink-secondary mt-0.5">Topik: {content.topic}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {displayPlatforms.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {displayPlatforms.map((plat) => (
                              <PlatformBadge key={plat} platform={plat} size="sm" />
                            ))}
                          </div>
                        ) : (
                          <span className="text-ink-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-secondary max-w-xs">
                        <span className="italic text-slate-600 dark:text-slate-400">
                          {content.savings_reason || 'Disimpan tanpa catatan khusus'}
                        </span>
                        {content.saved_at && (
                          <div className="text-[11px] text-ink-muted mt-0.5">
                            Disimpan: {formatDate(content.saved_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-ink-secondary">
                        {content.pic || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/content/${content.id}`}>
                            <Button variant="ghost" size="icon" title="Lihat Detail Konten">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setMoveModal({ open: true, content })
                              setMoveDate(content.planned_date || '')
                            }}
                            className="text-xs h-8 text-primary border-primary/30 hover:bg-primary/5"
                          >
                            <ArrowRight className="mr-1 h-3.5 w-3.5" />
                            Jadikan Rencana
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRescheduleModal({ open: true, content })
                              setRescheduleDate(content.planned_date || '')
                            }}
                            className="text-xs h-8"
                          >
                            <Clock className="mr-1 h-3.5 w-3.5" />
                            Jadwalkan Ulang
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteModal(content)}
                            title="Hapus dari Tabungan"
                            className="text-danger hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Dialog: Masukkan Kembali ke Rencana Konten */}
      <Dialog open={moveModal.open} onOpenChange={(open) => !saving && setMoveModal({ open, content: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masukkan Kembali ke Rencana Konten</DialogTitle>
            <DialogDescription>
              Konten &quot;{moveModal.content?.title}&quot; akan dipindahkan kembali ke modul Rencana Konten aktif dengan status Dalam Proses.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="moveDate">Tanggal Rencana Publikasi Baru (Opsional)</Label>
              <Input
                id="moveDate"
                type="date"
                value={moveDate}
                onChange={(e) => setMoveDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="moveReason">Catatan / Alasan Pengaktifan</Label>
              <Textarea
                id="moveReason"
                value={moveReason}
                onChange={(e) => setMoveReason(e.target.value)}
                placeholder="Contoh: Relevan untuk kampanye bulan ini..."
                rows={3}
              />
            </div>
            {error && <p className="text-sm font-medium text-danger">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveModal({ open: false, content: null })} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleMoveToPlan} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pindahkan ke Rencana Konten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Jadwalkan Ulang */}
      <Dialog open={rescheduleModal.open} onOpenChange={(open) => !saving && setRescheduleModal({ open, content: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jadwalkan Ulang Konten</DialogTitle>
            <DialogDescription>
              Tentukan tanggal publikasi baru untuk konten &quot;{rescheduleModal.content?.title}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rescheduleDate">Tanggal Publikasi Baru *</Label>
              <Input
                id="rescheduleDate"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="toPlan"
                type="checkbox"
                checked={rescheduleToPlan}
                onChange={(e) => setRescheduleToPlan(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="toPlan" className="text-sm font-normal cursor-pointer">
                Langsung masukkan ke Rencana Konten aktif (bukan tetap di tabungan)
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rescheduleReason">Alasan Penjadwalan Ulang</Label>
              <Textarea
                id="rescheduleReason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Tuliskan alasan penyesuaian jadwal..."
                rows={3}
              />
            </div>
            {error && <p className="text-sm font-medium text-danger">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleModal({ open: false, content: null })} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleReschedule} disabled={saving || !rescheduleDate}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Jadwal Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Konten Tabungan */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-5 w-5" />
              Hapus Konten dari Tabungan?
            </DialogTitle>
            <DialogDescription>
              Konten ini akan dihapus secara permanen dari sistem dan tidak dapat dipulihkan.
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
                {deleteTarget.savings_reason && (
                  <p className="text-[11px] text-slate-500 italic">
                    Alasan disimpan: &quot;{deleteTarget.savings_reason}&quot;
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
              disabled={deleteLoading}
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
