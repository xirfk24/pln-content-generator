'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useRouter } from '@/compat/next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import { CONTENT_FORMATS, CONTENT_PRIORITIES, CONTENT_STATUS_LABELS, CONTENT_PURPOSES, CONTENT_PURPOSE_LABELS, POSTING_CATEGORIES, POSTING_CATEGORY_LABELS } from '@/constants'
import { AIImprovePanel } from '@/components/ai/ai-improve-panel'
import { Select } from '@/components/ui/select'
import type { Content } from '@/types'

interface MasterData {
  pillars: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string }>
  platforms: Array<{ id: string; name: string }>
}

export default function EditContentPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [masterData, setMasterData] = useState<MasterData>({pillars: [], categories: [], platforms: []})
  const [form, setForm] = useState({
    title: '',
    topic: '',
    pillar_id: '',
    category_id: '',
    platform_id: '',
    format: 'Carousel',
    brief: '',
    target_audience: '',
    planned_date: '',
    reference: '',
    brief_link: '',
    result_link: '',
    pic: '',
    priority: 'MEDIUM',
    status: 'DRAFT',
    content_purpose: '',
    posting_category: '',
  })

  useEffect(() => {
    apiFetch('/api/master-data')
      .then(res => res.json())
      .then(data => setMasterData(data))
      .catch(console.error)

    apiFetch(`/api/contents/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          const c: Content = data.content
          setForm({
            title: c.title || '',
            topic: c.topic || '',
            pillar_id: c.pillar_id || '',
            category_id: c.category_id || '',
            platform_id: c.platform_id || '',
            format: c.format || 'Carousel',
            brief: c.brief || '',
            target_audience: c.target_audience || '',
            planned_date: c.planned_date || '',
            reference: (c as Content & { reference?: string | null }).reference || '',
            brief_link: (c as Content & { brief_link?: string | null }).brief_link || '',
            result_link: (c as Content & { result_link?: string | null }).result_link || '',
            pic: c.pic || '',
            priority: c.priority || 'MEDIUM',
            status: c.status || 'DRAFT',
            content_purpose: (c as Content & { content_purpose?: string | null }).content_purpose || '',
            posting_category: (c as Content & { posting_category?: string | null }).posting_category || '',
          })
        }
      })
      .catch(console.error)
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await apiFetch(`/api/contents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        router.push(`/content/${id}`)
      }
    } catch (error) {
      console.error('Failed to update content:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateWithAI() {
    const platform = masterData.platforms.find(p => p.id === form.platform_id)

    if (!platform || !form.topic) {
      alert('Please fill platform and topic first')
      return
    }

    setLoading(true)
    try {
      const res = await apiFetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.topic,
          pillar: form.content_purpose ? CONTENT_PURPOSE_LABELS[form.content_purpose] || '' : '',
          platform: platform.name,
          format: form.format,
          targetAudience: form.target_audience,
        }),
      })

      const data = await res.json()
      if (data.result) {
        setForm(prev => ({
          ...prev,
          title: data.result.title || prev.title,
          brief: data.result.brief || prev.brief,
        }))
      }
    } catch (error) {
      console.error('Failed to generate:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Edit Content</h1>
        <p className="mt-1 text-sm text-ink-secondary">Update content plan</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Topic *</Label>
                <Input
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select
                  value={form.pillar_id}
                  onChange={(e) => setForm({ ...form, pillar_id: e.target.value })}
                  className="w-full"
                >
                  <option value="">Select tema</option>
                  {masterData.pillars.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={form.platform_id}
                  onChange={(e) => setForm({ ...form, platform_id: e.target.value })}
                  className="w-full"
                >
                  <option value="">Select platform</option>
                  {masterData.platforms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format *</Label>
                <Select
                  value={form.format}
                  onChange={(e) => setForm({ ...form, format: e.target.value })}
                  className="w-full"
                >
                  {CONTENT_FORMATS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Content Purpose</Label>
                <Select
                  value={form.content_purpose}
                  onChange={(e) => setForm({ ...form, content_purpose: e.target.value })}
                  className="w-full"
                >
                  <option value="">Select purpose</option>
                  {CONTENT_PURPOSES.map((p) => (
                    <option key={p} value={p}>{CONTENT_PURPOSE_LABELS[p]}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Posting Category</Label>
                <Select
                  value={form.posting_category}
                  onChange={(e) => setForm({ ...form, posting_category: e.target.value })}
                  className="w-full"
                >
                  <option value="">Select category</option>
                  {POSTING_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{POSTING_CATEGORY_LABELS[c]}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full"
                >
                  <option value="">Select</option>
                  {masterData.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full"
                >
                  {CONTENT_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Planned Date</Label>
                <Input
                  type="date"
                  value={form.planned_date}
                  onChange={(e) => setForm({ ...form, planned_date: e.target.value })}
                />
                {form.planned_date && (
                  <p className="text-xs text-ink-muted">
                    Day: {['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(form.planned_date).getDay()]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full"
                >
                  {Object.entries(CONTENT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Link atau referensi konten (opsional)"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Brief Link</Label>
                <Input
                  value={form.brief_link}
                  onChange={(e) => setForm({ ...form, brief_link: e.target.value })}
                  placeholder="Link brief/design (Canva, Drive, dll.)"
                />
              </div>

              <div className="space-y-2">
                <Label>Result Link</Label>
                <Input
                  value={form.result_link}
                  onChange={(e) => setForm({ ...form, result_link: e.target.value })}
                  placeholder="Link hasil konten (opsional)"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Input
                  value={form.target_audience}
                  onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>PIC</Label>
                <Input
                  value={form.pic}
                  onChange={(e) => setForm({ ...form, pic: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Brief</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateWithAI}
                  disabled={loading || !form.platform_id || !form.topic}
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Generate with AI
                </Button>
              </div>
              <Textarea
                value={form.brief}
                onChange={(e) => setForm({ ...form, brief: e.target.value })}
                rows={5}
              />
              <div className="pt-1">
                <AIImprovePanel
                  content={form.brief}
                  platform={
                    masterData.platforms.find((p) => p.id === form.platform_id)?.name ||
                    'Instagram'
                  }
                  onApply={(improved) => setForm((prev) => ({ ...prev, brief: improved }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !form.title || !form.topic}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
