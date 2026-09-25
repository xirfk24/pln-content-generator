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
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Lock } from 'lucide-react'
import Link from '@/compat/next'
import {
  CONTENT_FORMATS,
  CONTENT_PRIORITIES,
  CONTENT_PRIORITY_LABELS,
  CONTENT_STATUS_LABELS,
  POSTING_CATEGORIES,
  POSTING_CATEGORY_LABELS,
  CONTENT_PILLAR_OPTIONS,
} from '@/constants'
import { useTopics } from '@/lib/use-topics'
import { PlatformSelector } from '@/components/ui/platform-icon'
import { AIImprovePanel } from '@/components/ai/ai-improve-panel'
import type { Content, Pillar, Category, Platform } from '@/types'

export default function EditContentPage() {
  const { id } = useParams()
  const router = useRouter()
  const topics = useTopics()
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
    priority: 'MEDIUM',
    posting_category: '',
  })

  const isLocked = ['PENDING_REVIEW', 'APPROVED', 'READY_TO_PUBLISH', 'PUBLISHED'].includes(contentStatus)

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
            priority: c.priority || 'MEDIUM',
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

  // Normalizer topik untuk pencocokan dropdown
  const normalizedTopicValue = useMemo(() => {
    if (!form.topic) return ''
    const match = topics.find(
      (t) =>
        t.toLowerCase() === form.topic.toLowerCase() ||
        t.replace(/^[A-Z]\s*-\s*/, '').toLowerCase() === form.topic.toLowerCase()
    )
    if (match) return match
    return 'Z - Lain-Lain'
  }, [form.topic, topics])



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.title.trim()) {
      alert('Silakan masukkan Judul Rencana Konten.')
      return
    }

    if (!form.topic.trim()) {
      alert('Silakan pilih atau masukkan Topik Konten.')
      return
    }

    if (!form.format) {
      alert('Silakan pilih Format Konten.')
      return
    }

    if (form.platform_ids.length === 0) {
      alert('Silakan pilih minimal 1 Target Platform sebelum menyimpan.')
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
      priority: form.priority || 'MEDIUM',
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
      alert('Terjadi kesalahan jaringan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Banner Penjelasan */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 p-4.5 shadow-xs dark:border-blue-900/50 dark:from-blue-950/30 dark:to-indigo-950/20">
        <div className="flex items-center justify-between">
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
              Status konten saat ini:{' '}
              <Badge variant="outline" className="font-semibold ml-1">
                {CONTENT_STATUS_LABELS[contentStatus] || contentStatus}
              </Badge>
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
                placeholder="Contoh: Nyalakan Harapan di Hari Raya: 5 Langkah Efisiensi Energi..."
                disabled={isLocked}
                className="bg-white dark:bg-slate-900 font-normal text-slate-700 dark:text-slate-200 placeholder:font-normal placeholder:text-slate-400"
                required
              />
            </div>

            {/* SEKSI 2: TOPIK KONTEN & CONTENT PILLAR */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 space-y-4 dark:border-blue-900/30 dark:bg-blue-950/10">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                <span>Topik Konten &amp; Content Pillar</span>
              </div>

              {/* TOPIK KONTEN (Dropdown Pilihan Resmi PLN UID Jabar A - Z) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="topic_select" className="font-semibold">
                    Topik Konten (A - Z) *
                  </Label>
                  <span className="text-[11px] text-ink-muted">
                    Daftar topik resmi Bagian Komunikasi PLN UID Jawa Barat
                  </span>
                </div>

                <Select
                  id="topic_select"
                  value={normalizedTopicValue}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === 'Z - Lain-Lain') {
                      if (topics.includes(form.topic) && form.topic !== 'Z - Lain-Lain') {
                        setForm((prev) => ({ ...prev, topic: '' }))
                      } else {
                        setForm((prev) => ({ ...prev, topic: 'Z - Lain-Lain' }))
                      }
                    } else {
                      setForm((prev) => ({ ...prev, topic: val }))
                    }
                  }}
                  disabled={isLocked}
                  className="w-full bg-white dark:bg-slate-900 font-normal text-slate-700 dark:text-slate-200"
                  required
                >
                  <option value="">Pilih Topik Konten</option>
                  {topics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>

                {/* Input tambahan jika topik tidak ada di daftar atau memilih Z - Lain-Lain */}
                {(normalizedTopicValue === 'Z - Lain-Lain' && (!topics.includes(form.topic) || form.topic === 'Z - Lain-Lain' || form.topic === 'Lain-lain')) && (
                  <div className="pt-1">
                    <Input
                      id="custom_topic"
                      value={form.topic === 'Z - Lain-Lain' || form.topic === 'Lain-lain' ? '' : form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      placeholder="Ketik nama topik khusus / lainnya..."
                      disabled={isLocked}
                      className="bg-white dark:bg-slate-900 font-normal text-slate-700 dark:text-slate-200 placeholder:font-normal placeholder:text-slate-400"
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
                    className="w-full bg-white dark:bg-slate-900 font-normal text-slate-700 dark:text-slate-200"
                    required
                  >
                    <option value="">Pilih Content Pillar</option>
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
                    className="w-full bg-white dark:bg-slate-900 font-normal text-slate-700 dark:text-slate-200"
                  >
                    <option value="">Pilih Kategori Posting</option>
                    {POSTING_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {POSTING_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </Select>
                  {form.posting_category?.startsWith('REPOST') ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-md border border-emerald-200 dark:border-emerald-800/50">
                      <span>✓ Konten Repost otomatis langsung disetujui &amp; berstatus <strong>Siap Publikasi (READY_TO_PUBLISH)</strong>.</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-ink-muted">
                      Klasifikasi kategori konten (UID, Repost id, Repost mobile, Repost UP3, Lain-lain).
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* SEKSI 3: TARGET PLATFORM BERBASIS IKON VISUAL */}
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
                platforms={platforms.filter(
                  (p) => !['website', 'linkedin'].includes(p.name.toLowerCase())
                )}
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
                  className="w-full font-normal text-slate-700 dark:text-slate-200"
                  required
                >
                  <option value="">Pilih Format Konten</option>
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
                  placeholder="dd/mm/yyyy"
                  className="font-normal text-slate-700 dark:text-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioritas Konten</Label>
                <Select
                  id="priority"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  disabled={isLocked}
                  className="w-full font-normal text-slate-700 dark:text-slate-200"
                >
                  <option value="">Pilih Prioritas Konten</option>
                  {CONTENT_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {CONTENT_PRIORITY_LABELS[p]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="target_audience">Target Audiens</Label>
              <Input
                id="target_audience"
                value={form.target_audience}
                onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                placeholder="Contoh: Pelanggan Rumah Tangga, Generasi Muda, Pengguna EV..."
                disabled={isLocked}
                className="font-normal text-slate-700 dark:text-slate-200 placeholder:font-normal placeholder:text-slate-400"
              />
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
                className="font-normal text-slate-700 dark:text-slate-200 placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brief_link">Tautan Google Drive / Canva (Opsional)</Label>
              <Input
                id="brief_link"
                value={form.brief_link}
                onChange={(e) => setForm({ ...form, brief_link: e.target.value })}
                disabled={isLocked}
                placeholder="https://drive.google.com/... atau https://canva.com/..."
                className="font-normal text-slate-700 dark:text-slate-200 placeholder:font-normal placeholder:text-slate-400"
              />
              <p className="text-[11px] text-ink-muted">
                Tautan materi, brief, atau file desain konten (opsional, dapat diisi saat pengajuan maupun setelah selesai produksi)
              </p>
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
