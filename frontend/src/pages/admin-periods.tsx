'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from '@/compat/next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Plus,
  CalendarRange,
  Calendar,
  CheckCircle2,
  Clock,
  Archive,
  Trash2,
  Edit2,
  MoreVertical,
  Check,
  AlertTriangle,
  FileText,
  BarChart3,
  Eye,
  Layers,
  Send,
  User,
  ExternalLink,
  ShieldCheck,
  RotateCw,
} from 'lucide-react'
import { formatDate, formatDateWithDay } from '@/lib/utils'
import type { PlanningPeriod, MonthBreakdown, Content, PerformanceMetric, UserRole } from '@/types'

type DetailTab = 'OVERVIEW' | 'MONTHLY' | 'CONTENTS' | 'PERFORMANCE'

export default function AdminPeriodsPage() {
  const [periods, setPeriods] = useState<PlanningPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  // Form Modal (Create / Edit)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<PlanningPeriod | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    status: 'DRAFT',
    description: '',
  })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<{
    period: PlanningPeriod | null
    monthly_breakdown: MonthBreakdown[]
    contents: Content[]
    performance: PerformanceMetric | null
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('OVERVIEW')

  // Action Menu Popover
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  // Archive & Delete Confirmation Dialogs
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [periodToArchive, setPeriodToArchive] = useState<PlanningPeriod | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [periodToDelete, setPeriodToDelete] = useState<PlanningPeriod | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Load All Periods
  const loadPeriods = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, meRes] = await Promise.all([
        apiFetch('/api/planning-periods'),
        apiFetch('/api/auth/me'),
      ])
      if (pRes.ok) {
        const data = await pRes.json()
        setPeriods(data.periods || [])
      }
      if (meRes.ok) {
        const meData = await meRes.json()
        setUserRole(meData?.user?.profile?.role || null)
      }
    } catch (err) {
      console.error('Failed to load planning periods:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPeriods()
  }, [loadPeriods])

  // Load Single Period Detail
  const loadPeriodDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const res = await apiFetch(`/api/planning-periods/${id}`)
      if (res.ok) {
        const data = await res.json()
        setDetailData(data)
      }
    } catch (err) {
      console.error('Failed to load period detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleOpenDetail = (period: PlanningPeriod) => {
    setSelectedPeriodId(period.id)
    setActiveDetailTab('OVERVIEW')
    setDetailModalOpen(true)
    loadPeriodDetail(period.id)
  }

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingPeriod(null)
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      status: 'DRAFT',
      description: '',
    })
    setFormError(null)
    setFormModalOpen(true)
  }

  // Open Edit Form
  const handleOpenEdit = (period: PlanningPeriod) => {
    setActiveMenuId(null)
    setEditingPeriod(period)
    setFormData({
      name: period.name,
      start_date: period.start_date,
      end_date: period.end_date,
      status: period.status,
      description: period.description || '',
    })
    setFormError(null)
    setFormModalOpen(true)
  }

  const formatDateLong = (dateStr: string) => {
    if (!dateStr) return '-'
    const [y, m, d] = dateStr.split('-').map(Number)
    if (!y || !m || !d) return formatDate(dateStr)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Real-time overlap conflict detection
  const overlappingPeriod = useMemo(() => {
    if (!formData.start_date || !formData.end_date) return null
    if (formData.end_date < formData.start_date) return null

    return periods.find((p) => {
      if (editingPeriod && p.id === editingPeriod.id) return false
      if (p.status === 'DIARSIPKAN') return false
      return formData.start_date <= p.end_date && formData.end_date >= p.start_date
    }) || null
  }, [formData.start_date, formData.end_date, periods, editingPeriod])

  // Submit Create / Edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormError('Nama periode wajib diisi.')
      return
    }
    if (!formData.start_date || !formData.end_date) {
      setFormError('Tanggal mulai dan selesai wajib diisi.')
      return
    }
    if (formData.end_date < formData.start_date) {
      setFormError('Tanggal selesai tidak boleh sebelum tanggal mulai.')
      return
    }
    if (overlappingPeriod) {
      setFormError(
        `Rentang tanggal bertabrakan dengan periode "${overlappingPeriod.name}" (${formatDateLong(
          overlappingPeriod.start_date
        )} – ${formatDateLong(overlappingPeriod.end_date)}). Silakan gunakan tanggal yang belum terpakai.`
      )
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    try {
      const endpoint = editingPeriod
        ? `/api/planning-periods/${editingPeriod.id}`
        : '/api/planning-periods'
      const method = editingPeriod ? 'PUT' : 'POST'

      const res = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Gagal menyimpan periode perencanaan.')
        return
      }

      setFormModalOpen(false)
      loadPeriods()
    } catch {
      setFormError('Terjadi kesalahan jaringan. Silakan coba lagi.')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Activate Period
  const handleActivate = async (id: string) => {
    setActiveMenuId(null)
    try {
      await apiFetch(`/api/planning-periods/${id}/activate`, { method: 'POST' })
      loadPeriods()
    } catch (err) {
      console.error('Failed to activate period:', err)
    }
  }

  // Confirm Archive
  const handleOpenArchive = (period: PlanningPeriod) => {
    setActiveMenuId(null)
    setPeriodToArchive(period)
    setActionError(null)
    setArchiveModalOpen(true)
  }

  const handleConfirmArchive = async () => {
    if (!periodToArchive) return
    setActionLoading(true)
    try {
      const res = await apiFetch(`/api/planning-periods/${periodToArchive.id}/archive`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        setActionError(data.error || 'Gagal mengarsipkan periode.')
        return
      }
      setArchiveModalOpen(false)
      loadPeriods()
    } catch {
      setActionError('Terjadi kesalahan jaringan.')
    } finally {
      setActionLoading(false)
    }
  }

  // Confirm Delete
  const handleOpenDelete = (period: PlanningPeriod) => {
    setActiveMenuId(null)
    setPeriodToDelete(period)
    setActionError(null)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!periodToDelete) return
    if (periodToDelete.total_contents > 0) {
      setActionError(
        'Periode ini sudah memiliki data konten dan tidak dapat dihapus. Gunakan Arsipkan.'
      )
      return
    }

    setActionLoading(true)
    try {
      const res = await apiFetch(`/api/planning-periods/${periodToDelete.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.error || 'Gagal menghapus periode.')
        return
      }
      setDeleteModalOpen(false)
      loadPeriods()
    } catch {
      setActionError('Terjadi kesalahan jaringan.')
    } finally {
      setActionLoading(false)
    }
  }

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'AKTIF':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Aktif
          </span>
        )
      case 'SELESAI':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            <Check className="h-3 w-3" />
            Selesai
          </span>
        )
      case 'DIARSIPKAN':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <Archive className="h-3 w-3" />
            Diarsipkan
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Draft
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-slate-500">Memuat periode perencanaan...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Periode Perencanaan
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola periode perencanaan konten berdasarkan semester.
          </p>
        </div>

        {userRole === 'ADMIN' && (
          <Button onClick={handleOpenCreate} size="sm" className="self-start sm:self-auto">
            <Plus className="mr-1.5 h-4 w-4" />
            Buat Periode
          </Button>
        )}
      </div>

      {/* List of Periods */}
      {periods.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarRange className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
            Belum ada periode perencanaan
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Admin dapat membuat periode untuk mulai mengelola perencanaan konten semester.
          </p>
          {userRole === 'ADMIN' && (
            <Button onClick={handleOpenCreate} size="sm" className="mt-4">
              <Plus className="mr-1.5 h-4 w-4" />
              Buat Periode
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {periods.map((period) => {
            return (
              <Card
                key={period.id}
                className="transition-all hover:border-primary/40 hover:shadow-sm dark:border-slate-800"
              >
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  {/* Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {period.name}
                      </h2>
                      {renderStatusBadge(period.status)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        {formatDate(period.start_date)} – {formatDate(period.end_date)}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-primary">
                      {period.total_contents} konten
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetail(period)}
                      className="text-xs font-medium"
                    >
                      Lihat Detail
                    </Button>

                    {userRole === 'ADMIN' && (
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setActiveMenuId(activeMenuId === period.id ? null : period.id)
                          }
                          className="h-8 w-8 text-slate-400 hover:text-slate-600"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>

                        {activeMenuId === period.id && (
                          <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(period)}
                              className="flex w-full items-center px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                            >
                              <Edit2 className="mr-2 h-3.5 w-3.5 text-slate-400" />
                              Edit Periode
                            </button>

                            {period.status !== 'AKTIF' && (
                              <button
                                type="button"
                                onClick={() => handleActivate(period.id)}
                                className="flex w-full items-center px-3.5 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                              >
                                <Check className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                                Jadikan Aktif
                              </button>
                            )}

                            {period.status !== 'DIARSIPKAN' && (
                              <button
                                type="button"
                                onClick={() => handleOpenArchive(period)}
                                className="flex w-full items-center px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50"
                              >
                                <Archive className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                Arsipkan
                              </button>
                            )}

                            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                            <button
                              type="button"
                              onClick={() => handleOpenDelete(period)}
                              className="flex w-full items-center px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-500" />
                              Hapus Periode
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                {editingPeriod ? 'Edit Periode Perencanaan' : 'Buat Periode Perencanaan'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Tentukan rentang semester untuk perencanaan dan pengelompokan konten.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              {/* Warning when editing dates on period with existing contents */}
              {editingPeriod && editingPeriod.total_contents > 0 && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Perubahan periode dapat memengaruhi pengelompokan konten yang sudah ada.
                    Pastikan tanggal baru sesuai dengan data yang telah tersimpan.
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="periodName" className="text-xs font-semibold">
                  Nama Periode <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="periodName"
                  placeholder="Contoh: Semester 2 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-xs font-semibold">
                    Tanggal Mulai <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => {
                      setFormData({ ...formData, start_date: e.target.value })
                      setFormError(null)
                    }}
                    className={`text-xs ${overlappingPeriod ? 'border-rose-300 focus-visible:ring-rose-400' : ''}`}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-xs font-semibold">
                    Tanggal Selesai <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => {
                      setFormData({ ...formData, end_date: e.target.value })
                      setFormError(null)
                    }}
                    className={`text-xs ${overlappingPeriod ? 'border-rose-300 focus-visible:ring-rose-400' : ''}`}
                    required
                  />
                </div>
              </div>

              {/* Conflict Notification Banner if dates overlap with another active/draft/completed period */}
              {overlappingPeriod && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800/80 dark:bg-rose-950/40 dark:text-rose-300 animate-in fade-in-50 duration-200">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-rose-900 dark:text-rose-200">
                        Tanggal, bulan & tahun sudah terpakai!
                      </p>
                      <p className="leading-relaxed">
                        Rentang tanggal yang Anda pilih bertabrakan dengan periode{' '}
                        <span className="font-bold underline decoration-rose-300 decoration-1 underline-offset-2">
                          {overlappingPeriod.name}
                        </span>{' '}
                        ({formatDateLong(overlappingPeriod.start_date)} –{' '}
                        {formatDateLong(overlappingPeriod.end_date)}).
                      </p>
                      <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">
                        Silakan gunakan tanggal lain yang belum terdaftar di semester mana pun.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="periodStatus" className="text-xs font-semibold">
                  Status
                </Label>
                <Select
                  id="periodStatus"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="text-xs"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="AKTIF">AKTIF</option>
                  <option value="SELESAI">SELESAI</option>
                  <option value="DIARSIPKAN">DIARSIPKAN</option>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="periodDesc" className="text-xs font-semibold">
                  Deskripsi <span className="text-slate-400 font-normal">(Opsional)</span>
                </Label>
                <Textarea
                  id="periodDesc"
                  rows={2}
                  placeholder="Keterangan fokus perencanaan pada semester ini..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="text-xs"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 rounded-md bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormModalOpen(false)}
                disabled={formSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={formSubmitting || !!overlappingPeriod}
              >
                {formSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Periode'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive Modal */}
      <Dialog open={archiveModalOpen} onOpenChange={setArchiveModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Arsipkan periode ini?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Periode yang diarsipkan tetap dapat dilihat pada histori tetapi tidak digunakan
              sebagai periode aktif.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="rounded-md bg-rose-50 p-2.5 text-xs text-rose-700">
              {actionError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchiveModalOpen(false)}
              disabled={actionLoading}
            >
              Batal
            </Button>
            <Button size="sm" onClick={handleConfirmArchive} disabled={actionLoading}>
              {actionLoading ? 'Mengarsipkan...' : 'Ya, Arsipkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Hapus Periode Perencanaan?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Periode yang belum memiliki data konten dapat dihapus secara permanen.
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="flex items-start gap-2 rounded-md bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{actionError}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={actionLoading}
            >
              Tutup
            </Button>
            {(!periodToDelete || periodToDelete.total_contents === 0) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Menghapus...' : 'Hapus Periode'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal (4 Tabs: Overview, Per Bulan, Konten, Performa) */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-y-auto">
          {detailLoading || !detailData?.period ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-slate-500">Memuat rincian periode...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Modal Header */}
              <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {detailData.period.name}
                    </h2>
                    {renderStatusBadge(detailData.period.status)}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(detailData.period.start_date)} –{' '}
                    {formatDate(detailData.period.end_date)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailModalOpen(false)
                      handleOpenEdit(detailData.period!)
                    }}
                    className="text-xs"
                  >
                    <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </div>

              {/* Summary 4-card Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card className="border-slate-200 shadow-xs dark:border-slate-800">
                  <CardContent className="p-3.5">
                    <p className="text-[11px] font-medium text-slate-500">Total Konten</p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                      {detailData.period.total_contents}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-xs dark:border-slate-800">
                  <CardContent className="p-3.5">
                    <p className="text-[11px] font-medium text-slate-500">Published</p>
                    <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {detailData.period.published_count}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-xs dark:border-slate-800">
                  <CardContent className="p-3.5">
                    <p className="text-[11px] font-medium text-slate-500">Draft</p>
                    <p className="mt-1 text-xl font-bold text-slate-600 dark:text-slate-300">
                      {detailData.period.draft_count}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-xs dark:border-slate-800">
                  <CardContent className="p-3.5">
                    <p className="text-[11px] font-medium text-slate-500">Menunggu Review</p>
                    <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                      {detailData.period.pending_count}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* 4 Tabs Header */}
              <div className="flex border-b border-slate-200 text-xs font-medium dark:border-slate-800">
                {(
                  [
                    { id: 'OVERVIEW', label: 'Overview' },
                    { id: 'MONTHLY', label: 'Per Bulan' },
                    { id: 'CONTENTS', label: `Konten (${detailData.contents.length})` },
                    { id: 'PERFORMANCE', label: 'Performa' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveDetailTab(tab.id)}
                    className={`border-b-2 px-4 py-2.5 transition-colors ${
                      activeDetailTab === tab.id
                        ? 'border-primary text-primary font-semibold'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB 1: OVERVIEW */}
              {activeDetailTab === 'OVERVIEW' && (
                <div className="space-y-4 pt-1">
                  {/* Publication Progress Bar */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <span>Progres Realisasi Publikasi</span>
                      <span>
                        {detailData.period.total_contents > 0
                          ? Math.round(
                              (detailData.period.published_count /
                                detailData.period.total_contents) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${
                            detailData.period.total_contents > 0
                              ? (detailData.period.published_count /
                                  detailData.period.total_contents) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      {detailData.period.published_count} dari {detailData.period.total_contents}{' '}
                      konten telah berhasil dipublikasikan.
                    </p>
                  </div>

                  {detailData.period.description && (
                    <div className="rounded-xl border border-slate-200 p-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Catatan & Fokus Perencanaan:
                      </p>
                      <p className="mt-1 leading-relaxed">{detailData.period.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PER BULAN */}
              {activeDetailTab === 'MONTHLY' && (
                <div className="space-y-2.5 pt-1">
                  <p className="text-xs text-slate-500">
                    Bulan turunan yang dihitung otomatis dari rentang tanggal periode:
                  </p>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {detailData.monthly_breakdown.map((m) => (
                      <div
                        key={m.month_key}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {m.month_name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatDate(m.start_date)} – {formatDate(m.end_date)}
                          </p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                          {m.total_count} konten
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: KONTEN */}
              {activeDetailTab === 'CONTENTS' && (
                <div className="space-y-2 pt-1">
                  {detailData.contents.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-400">
                      Belum ada konten dalam periode ini.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                          <tr>
                            <th className="px-3.5 py-2.5">Judul Konten</th>
                            <th className="px-3.5 py-2.5">Pilar</th>
                            <th className="px-3.5 py-2.5">Tgl Rencana</th>
                            <th className="px-3.5 py-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {detailData.contents.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                              <td className="px-3.5 py-2.5 font-medium text-slate-900 dark:text-white">
                                <Link
                                  href={`/content/${c.id}`}
                                  className="hover:text-primary hover:underline"
                                >
                                  {c.title}
                                </Link>
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">
                                {c.pillar?.name || '-'}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-500 whitespace-nowrap">
                                {formatDate(c.planned_date)}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {c.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PERFORMA */}
              {activeDetailTab === 'PERFORMANCE' && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[11px] font-medium text-slate-500">Total Views</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {(detailData.performance?.views || 0).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[11px] font-medium text-slate-500">Total Reach</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {(detailData.performance?.reach || 0).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[11px] font-medium text-slate-500">Total Likes</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {(detailData.performance?.likes || 0).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[11px] font-medium text-slate-500">Total Comments</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {(detailData.performance?.comments || 0).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[11px] font-medium text-slate-500">Total Shares</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {(detailData.performance?.shares || 0).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[11px] font-medium text-slate-500">Total Saves</p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {(detailData.performance?.saves || 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
