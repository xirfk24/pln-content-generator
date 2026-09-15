import { apiFetch } from '@/lib/api'
import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useRouter } from '@/compat/next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Loader2, ArrowLeft, Lock, Lightbulb } from 'lucide-react'
import Link from '@/compat/next'
import {
  CONTENT_FORMATS,
  CONTENT_PRIORITIES,
  CONTENT_PRIORITY_LABELS,
  CONTENT_PURPOSES,
  CONTENT_PURPOSE_LABELS,
  CONTENT_STATUS_LABELS,
  POSTING_CATEGORIES,
  POSTING_CATEGORY_LABELS,
  PLN_TOPIC_OPTIONS,
  CONTENT_PILLAR_OPTIONS,
} from '@/constants'
import { PlatformSelector } from '@/components/ui/platform-icon'
import { AIImprovePanel } from '@/components/ai/ai-improve-panel'
import type { Content, Pillar, Category, Platform } from '@/types'

export default function EditContentPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [contentStatus, setContentStatus] = useState<string>('DRAFT')
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])

  const [form, setForm] = useState({
    title: '',
    topic: '',
    pillar_id: '',
    category_id: '',
    platform_ids: [] as string[],
    format: 'Carousel',
    brief: '',
    target_audience: '',
    planned_date: '',
    brief_link: '',
    pic: '',
    priority: 'MEDIUM',
    content_purposes: [] as string[],
    posting_category: '',
  })

  const isLocked = ['PENDING_REVIEW', 'APPROVED', 'PUBLISHED'].includes(contentStatus)

  useEffect(() => {
    apiFetch('/api/master-data')
      .then((res) => res.json())
      .then((data) => {
        setPillars(data.pillars || [])
        setCategories(data.categories || [])
        setPlatforms(data.platforms || [])
      })
      .catch(console.error)

    apiFetch(`/api/contents/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.content) {
          const c: Content = data.content
          setContentStatus(c.status)

          // Ambil platform_ids
          let pids: string[] = []
          if (c.platform_ids && c.platform_ids.length > 0) {
            pids = c.platform_ids
          } else if (c.platform_id) {
            pids = [c.platform_id]
          }

          // Ambil content_purposes
          let purposes: string[] = []
          if (c.content_purposes && c.content_purposes.length > 0) {
            purposes = c.content_purposes
          } else if (c.content_purpose) {
            purposes = [c.content_purpose]
          }

          setForm({
            title: c.title || '',
            topic: c.topic || '',
            pillar_id: c.pillar_id || '',
            category_id: c.category_id || '',
            platform_ids: pids,
            format: c.format || 'Carousel',
            brief: c.brief || '',
            target_audience: c.target_audience || '',
            planned_date: c.planned_date ? c.planned_date.split('T')[0] : '',
            brief_link: c.brief_link || '',
            pic: c.pic || '',
            priority: c.priority || 'MEDIUM',
            content_purposes: purposes,
            posting_category: c.posting_category || '',
          })
        }
      })
      .catch(console.error)
  }, [id])

  // Cari nama pilar yang aktif dipilih
  const selectedPillarName = useMemo(() => {
    const found = pillars.find((p) => p.id === form.pillar_id)
    return found ? found.name : ''
  }, [pillars, form.pillar_id])

  function togglePurpose(purposeKey: string) {
    if (isLocked) return
    setForm((prev) => {
      const exists = prev.content_purposes.includes(purposeKey)
      return {
        ...prev,
        content_purposes: exists
          ? prev.content_purposes.filter((p) => p !== purposeKey)
          : [...prev.content_purposes, purposeKey],
      }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked) {
      alert('Konten terkunci dan tidak dapat diedit.')
      return
    }
    if (!form.title.trim()) {
      alert('Silakan masukkan Judul Rencana Konten.')
      return
    }
    if (!form.topic.trim()) {
      alert('Silakan pilih atau masukkan Topik Konten.')
      return
    }
    if (form.platform_ids.length === 0) {
      alert('Silakan pilih minimal 1 Target Platform.')
      return
    }

    setLoading(true)

    const payload = {
      title: form.title.trim(),
      topic: form.topic.trim(),
      pillar_id: form.pillar_id || null,
      category_id: form.category_id || null,
      platform_ids: form.platform_ids.filter(Boolean),
      format: form.format || 'Carousel',
      brief: form.brief.trim() || null,
      target_audience: form.target_audience.trim() || null,
      planned_date: form.planned_date || null,
      brief_link: form.brief_link.trim() || null,
      pic: form.pic.trim() || null,
      priority: form.priority || 'MEDIUM',
      content_purposes: form.content_purposes,
      posting_category: form.posting_category || null,
    }

    try {
      const res = await apiFetch(`/api/contents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        router.push(`/content/${id}`)
      } else {
        const d = await res.json()
        alert(d.error || 'Gagal memperbarui rencana konten')
      }
    } catch (error: any) {
      console.error('Failed to update content:', error)
      alert('Terjadi kesalahan jaringan atau server: ' + (error?.message || error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Banner Navigasi */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={`/content/${id}`}
              className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Detail Konten
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Edit Rencana Konten
            </h1>
            <p className="mt-0.5 text-sm text-ink-secondary">
              Status saat ini: <span className="font-semibold text-primary">{CONTENT_STATUS_LABELS[contentStatus] || contentStatus}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Lock Notice jika konten terkunci */}
      {isLocked && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4.5 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 shadow-xs">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 text-amber-600 shrink-0 dark:text-amber-400" />
            <div>
              <h3 className="font-semibold text-sm">Konten Sedang Terkunci</h3>
              <p className="text-xs leading-relaxed mt-0.5 text-amber-900/80 dark:text-amber-300/80">
                Konten dengan status <strong>{CONTENT_STATUS_LABELS[contentStatus]}</strong> tidak dapat diedit langsung untuk menjaga konsistensi alur persetujuan. Jika memerlukan perubahan, mintalah reviewer untuk mengajukan permintaan revisi.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base font-semibold">Formulir Rencana Konten</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* SEKSI 1: JUDUL KONTEN (Paling Atas) */}
            <div className="space-y-2">
              <Label htmlFor="title" className="font-semibold text-sm text-ink">
                Judul Rencana Konten *
              </Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Judul materi konten..."
                disabled={isLocked}
                className="bg-white dark:bg-slate-900 font-medium"
                required
              />
            </div>

            {/* SEKSI 2: TOPIK KONTEN & CONTENT PILLAR */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 space-y-4 dark:border-blue-900/30 dark:bg-blue-950/10">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                <span>📌 Topik Konten &amp; Content Pillar</span>
              </div>

              {/* TOPIK KONTEN (Dropdown Pilihan Resmi PLN UID Jabar A - Z) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="topic_select" className="font-semibold">
                    Topik Konten (A - Z) *
                  </Label>
                  <span className="text-[11px] text-ink-muted">
                    Daftar topik resmi Divisi Humas PLN UID Jawa Barat
                  </span>
                </div>

                <Select
                  id="topic_select"
                  value={
                    PLN_TOPIC_OPTIONS.includes(form.topic as any)
                      ? form.topic
                      : form.topic
                      ? 'Lain-lain'
                      : ''
                  }
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === 'Lain-lain') {
                      if (PLN_TOPIC_OPTIONS.includes(form.topic as any) && form.topic !== 'Lain-lain') {
                        setForm((prev) => ({ ...prev, topic: '' }))
                      } else {
                        setForm((prev) => ({ ...prev, topic: 'Lain-lain' }))
                      }
                    } else {
                      setForm((prev) => ({ ...prev, topic: val }))
                    }
                  }}
                  disabled={isLocked}
                  className="w-full bg-white dark:bg-slate-900"
                  required
                >
                  <option value="">-- Pilih Topik Konten (A - Z) --</option>
                  {PLN_TOPIC_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>

                {/* Input tambahan jika topik tidak ada di daftar atau memilih Lain-lain */}
                {(!PLN_TOPIC_OPTIONS.includes(form.topic as any) || form.topic === 'Lain-lain') && (
                  <div className="pt-1">
                    <Input
                      id="custom_topic"
                      value={form.topic === 'Lain-lain' ? '' : form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      placeholder="Ketik nama topik khusus / lainnya..."
                      disabled={isLocked}
                      className="bg-white dark:bg-slate-900"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-blue-100 dark:border-blue-900/30">
                {/* Content Pillar */}
                <div className="space-y-2">
                  <Label htmlFor="pillar_id" className="font-semibold">
                    Content Pillar *
                  </Label>
                  <Select
                    id="pillar_id"
                    value={form.pillar_id}
                    onChange={(e) => {
                      const newPillarId = e.target.value
                      setForm((prev) => ({ ...prev, pillar_id: newPillarId }))
                    }}
                    disabled={isLocked}
                    className="w-full bg-white dark:bg-slate-900"
                    required
                  >
                    <option value="">-- Pilih Content Pillar --</option>
                    {CONTENT_PILLAR_OPTIONS.map((pillarLabel) => {
                      const match = pillars.find(
                        (p) =>
                          p.name.toLowerCase() === pillarLabel.toLowerCase() ||
                          p.name.toLowerCase().startsWith(pillarLabel.split(' ')[0].toLowerCase())
                      )
                      const optValue = match ? match.id : pillarLabel
                      return (
                        <option key={pillarLabel} value={optValue}>
                          {pillarLabel}
                        </option>
                      )
                    })}
                  </Select>
                  <p className="text-[11px] text-ink-muted">
                    Pilar tujuan komunikasi (Edukasi, Hiburan, Inspirasi, dll.)
                  </p>
                </div>

                {/* Kategori Posting */}
                <div className="space-y-2">
                  <Label htmlFor="posting_category">Kategori Posting</Label>
                  <Select
                    id="posting_category"
                    value={form.posting_category}
                    onChange={(e) => setForm({ ...form, posting_category: e.target.value })}
                    disabled={isLocked}
                    className="w-full bg-white dark:bg-slate-900"
                  >
                    <option value="">Pilih Kategori</option>
                    {POSTING_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {POSTING_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </Select>
                  <p className="text-[11px] text-ink-muted">
                    Klasifikasi penayangan konten (Original, Repost, Kampanye, dll.)
                  </p>
                </div>
              </div>
            </div>

            {/* SEKSI 3: TUJUAN KONTEN (CONTENT PURPOSE - Di Atas Target Platform) */}
            <div className="space-y-2 rounded-xl border p-4 bg-slate-50/50 dark:bg-slate-900/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-ink">
                  Tujuan Konten (Content Purpose)
                </Label>
                <span className="text-xs text-ink-muted">
                  Pilih satu atau beberapa tujuan komunikasi
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {CONTENT_PURPOSES.map((purposeKey) => {
                  const isSelected = form.content_purposes.includes(purposeKey)
                  return (
                    <button
                      key={purposeKey}
                      type="button"
                      disabled={isLocked}
                      onClick={() => togglePurpose(purposeKey)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-300 dark:ring-indigo-900'
                          : 'bg-white text-ink border-border hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700'
                      } ${isLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {CONTENT_PURPOSE_LABELS[purposeKey]}
                      {isSelected && <span>✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* SEKSI 4: TARGET PLATFORM BERBASIS IKON VISUAL */}
            <div className="space-y-3 rounded-xl border p-4 bg-slate-50/50 dark:bg-slate-900/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-ink">
                  Target Platform Media Sosial (Pilihan Berbasis Ikon) *
                </Label>
                <span className="text-xs text-ink-muted">
                  Bisa memilih lebih dari 1 platform
                </span>
              </div>

              <PlatformSelector
                platforms={platforms}
                selectedIds={form.platform_ids}
                onChange={(newIds) => setForm({ ...form, platform_ids: newIds })}
                disabled={isLocked}
              />
            </div>

            {/* Format, Tanggal Rencana & Prioritas */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="format">Format Konten *</Label>
                <Select
                  id="format"
                  value={form.format}
                  onChange={(e) => setForm({ ...form, format: e.target.value })}
                  disabled={isLocked}
                  className="w-full"
                >
                  {CONTENT_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planned_date">Tanggal Rencana Publikasi</Label>
                <Input
                  id="planned_date"
                  type="date"
                  value={form.planned_date}
                  onChange={(e) => setForm({ ...form, planned_date: e.target.value })}
                  disabled={isLocked}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioritas Konten</Label>
                <Select
                  id="priority"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  disabled={isLocked}
                  className="w-full"
                >
                  {CONTENT_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {CONTENT_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Target Audience & PIC */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="target_audience">Target Audiens</Label>
                <Input
                  id="target_audience"
                  value={form.target_audience}
                  onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                  disabled={isLocked}
                  placeholder="Target audiens"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pic">PIC (Person in Charge)</Label>
                <Input
                  id="pic"
                  value={form.pic}
                  onChange={(e) => setForm({ ...form, pic: e.target.value })}
                  disabled={isLocked}
                  placeholder="Nama PIC"
                />
              </div>
            </div>

            {/* Brief & Link */}
            <div className="space-y-2">
              <Label htmlFor="brief">Brief &amp; Naskah Konten</Label>
              <Textarea
                id="brief"
                value={form.brief}
                onChange={(e) => setForm({ ...form, brief: e.target.value })}
                disabled={isLocked}
                placeholder="Poin pesan utama, narasi, dan naskah konten..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brief_link">Link Desain / File Pendukung (Opsional)</Label>
              <Input
                id="brief_link"
                value={form.brief_link}
                onChange={(e) => setForm({ ...form, brief_link: e.target.value })}
                disabled={isLocked}
                placeholder="https://canva.com/... atau Drive"
              />
            </div>

            {/* AI Improvement Panel (hanya jika belum terkunci) */}
            {!isLocked && form.brief && (
              <div className="pt-2">
                <AIImprovePanel
                  content={form.brief}
                  platform={platforms.find((p) => form.platform_ids.includes(p.id))?.name || 'Instagram'}
                  onApply={(newBrief) => setForm((prev) => ({ ...prev, brief: newBrief }))}
                />
              </div>
            )}

            {/* Tombol Aksi */}
            <div className="flex items-center justify-end gap-3 border-t pt-5">
              <Button type="button" variant="outline" onClick={() => router.push(`/content/${id}`)}>
                {isLocked ? 'Kembali' : 'Batal'}
              </Button>
              {!isLocked && (
                <Button type="submit" disabled={loading || !form.title || !form.topic || form.platform_ids.length === 0}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan Perubahan
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
