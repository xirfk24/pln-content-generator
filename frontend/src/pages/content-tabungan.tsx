'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { useTopics } from '@/lib/use-topics'
import { SkeletonTable } from '@/components/ui/skeleton'
import type { Content, Pillar, Category, Platform } from '@/types'

export default function ContentTabunganPage() {
  const topics = useTopics()
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [topicFilter, setTopicFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user)
        }
      })
      .catch(console.error)
  }, [])

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
      if (topicFilter) params.set('topic', topicFilter)
      if (categoryFilter) params.set('category_id', categoryFilter)
      if (dateFilter) params.set('date', dateFilter)

      const res = await apiFetch(`/api/tabungan?${params.toString()}`)
      const data = await res.json()
      setContents(data.contents || [])
    } catch (err) {
      console.error('Failed to load tabungan contents:', err)
    } finally {
      setLoading(false)
    }
  }, [search, topicFilter, categoryFilter, dateFilter])

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

  const displayedContents = useMemo(() => {
    if (currentUser && currentUser.role === 'STAFF') {
      return contents.filter((c) => c.created_by === currentUser.id)
    }
    return contents
  }, [contents, currentUser])

  const hasFilters = search || topicFilter || categoryFilter || dateFilter

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
              Bank Konten
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Modul ini digunakan untuk menampung konten yang sudah direncanakan atau disetujui, belum sempat dipublikasikan, ditunda, atau dibatalkan dari antrean namun tetap relevan untuk digunakan pada waktu berikutnya dalam Bank Konten.
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
                placeholder="Cari konten di Bank Konten..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 font-normal text-slate-700 dark:text-slate-200 placeholder:font-normal placeholder:text-slate-400"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-44 font-normal text-slate-700 dark:text-slate-200"
                placeholder="dd/mm/yyyy"
              />
              <Select
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="w-full sm:w-48 font-normal text-slate-700 dark:text-slate-200"
              >
                <option value="">Semua Topik Konten</option>
                {topics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-40 font-normal text-slate-700 dark:text-slate-200"
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
            <span className="ml-2 text-sm text-ink-secondary">Memuat daftar Bank Konten...</span>
          </div>
          <div className="p-4">
            <SkeletonTable rows={5} cols={5} />
          </div>
        </Card>
      ) : displayedContents.length === 0 ? (
        <EmptyState
          icon={BookmarkCheck}
          title="Tidak ada konten dalam Bank Konten"
          description={
            hasFilters
              ? 'Tidak ditemukan konten Bank Konten yang sesuai dengan filter.'
              : 'Konten yang ditunda atau disimpan dari Antrean Publikasi akan muncul di sini.'
          }
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="min-w-[260px] px-5 py-3.5 text-left">Topik &amp; Judul Konten</th>
                  <th className="min-w-[160px] px-5 py-3.5 text-left">Tanggal Rencana</th>
                  <th className="min-w-[180px] px-5 py-3.5 text-left">Target Platform</th>
                  <th className="min-w-[240px] px-5 py-3.5 text-left">Alasan Bank Konten</th>
                  <th className="min-w-[140px] px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedContents.map((content) => {
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
                    <tr key={content.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-4 text-sm max-w-sm">
                        <div className="text-xs font-bold text-primary dark:text-sky-400 mb-1">
                          {content.topic || content.pillar?.name || 'Topik Umum'}
                        </div>
                        <Link href={`/content/${content.id}`} className="font-semibold text-slate-900 hover:text-primary dark:text-slate-100 line-clamp-2 transition-colors">
                          {content.title}
                        </Link>
                        {content.category?.name && (
                          <div className="inline-flex items-center mt-1.5 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {content.category.name}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{content.planned_date ? formatDate(content.planned_date) : '-'}</span>
                        </div>
                        {content.saved_at && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 pl-5">
                            Disimpan: {formatDate(content.saved_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {displayPlatforms.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {displayPlatforms.map((plat) => (
                              <PlatformBadge key={plat} platform={plat} size="sm" />
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Tidak ada platform</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs">
                        <div className="rounded-lg bg-amber-50/80 border border-amber-200/70 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-200">
                          <p className="line-clamp-2 italic">
                            {content.savings_reason || 'Disimpan tanpa catatan khusus'}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/content/${content.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg"
                              title="Lihat Detail Konten"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>

                          <Button
                            size="sm"
                            onClick={() => {
                              setRescheduleModal({ open: true, content })
                              setRescheduleDate(content.planned_date || '')
                            }}
                            className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-all rounded-lg shrink-0"
                          >
                            <Clock className="mr-1.5 h-3.5 w-3.5 text-blue-100" />
                            Jadwalkan Ulang
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteModal(content)}
                            title="Hapus dari Bank Konten"
                            className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-950/40 rounded-lg"
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
        </div>
      )}

      {/* Dialog: Masukkan Kembali ke Rencana Konten */}
      <Dialog open={moveModal.open} onOpenChange={(open) => !saving && setMoveModal({ open, content: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masukkan Kembali ke Rencana Konten</DialogTitle>
            <DialogDescription>
              Konten &quot;{moveModal.content?.title}&quot; akan dipindahkan dari Bank Konten kembali ke modul Rencana Konten aktif dengan status Dalam Proses.
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
                placeholder="dd/mm/yyyy"
                className="font-normal text-slate-700 dark:text-slate-200"
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
                className="font-normal text-slate-700 dark:text-slate-200 placeholder:font-normal placeholder:text-slate-400"
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
                placeholder="dd/mm/yyyy"
                className="font-normal text-slate-700 dark:text-slate-200"
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
                Langsung masukkan ke Rencana Konten aktif (bukan tetap di Bank Konten)
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
              Hapus Konten dari Bank Konten?
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
