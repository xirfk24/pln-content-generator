'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from '@/compat/next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Loader2, Sparkles } from 'lucide-react'
import { CONTENT_FORMATS, CONTENT_PRIORITIES } from '@/constants'

interface MasterData {
  pillars: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string }>
  platforms: Array<{ id: string; name: string }>
}

export default function NewContentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
      </div>
    }>
      <NewContentForm />
    </Suspense>
  )
}

function NewContentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
    pic: '',
    priority: 'MEDIUM',
  })

  useEffect(() => {
    apiFetch('/api/master-data')
      .then(res => res.json())
      .then(data => setMasterData(data))
      .catch(console.error)
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await apiFetch('/api/contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/content/${data.content.id}`)
      }
    } catch (error) {
      console.error('Failed to create content:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateWithAI() {
    const pillar = masterData.pillars.find(p => p.id === form.pillar_id)
    const platform = masterData.platforms.find(p => p.id === form.platform_id)
    
    if (!pillar || !platform || !form.topic) {
      alert('Please fill pillar, platform, and topic first')
      return
    }

    setLoading(true)
    try {
      const res = await apiFetch('/api/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.topic,
          pillar: pillar.name,
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
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">New Content</h1>
        <p className="mt-1 text-sm text-ink-secondary">Create a new content plan</p>
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
                  placeholder="Content topic"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Content title"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Pillar</Label>
                <Select
                  value={form.pillar_id}
                  onChange={(e) => setForm({ ...form, pillar_id: e.target.value })}
                  className="w-full"
                >
                  <option value="">Select pillar</option>
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

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full"
                >
                  <option value="">Select category</option>
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
                <Label>Target Audience</Label>
                <Input
                  value={form.target_audience}
                  onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                  placeholder="Target audience"
                />
              </div>

              <div className="space-y-2">
                <Label>PIC</Label>
                <Input
                  value={form.pic}
                  onChange={(e) => setForm({ ...form, pic: e.target.value })}
                  placeholder="Person in charge"
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
                  disabled={loading || !form.pillar_id || !form.platform_id || !form.topic}
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Generate with AI
                </Button>
              </div>
              <Textarea
                value={form.brief}
                onChange={(e) => setForm({ ...form, brief: e.target.value })}
                placeholder="Content brief, caption, or main message"
                rows={5}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !form.title || !form.topic}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Content
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
