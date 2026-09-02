'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { IDEA_STATUS_LABELS } from '@/constants'
import type { ContentIdea } from '@/types'

export default function EditIdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [pillars, setPillars] = useState<Array<{ id: string; name: string }>>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    pillar_id: '',
    target_audience: '',
    source: '',
    notes: '',
    status: 'DRAFT',
  })

  useEffect(() => {
    fetch('/api/master-data')
      .then(res => res.json())
      .then(data => setPillars(data.pillars || []))
      .catch(console.error)

    fetch(`/api/content-ideas/${id}`)
      .then(res => res.json())
      .then((data: { idea: ContentIdea }) => {
        if (data.idea) {
          setForm({
            title: data.idea.title || '',
            description: data.idea.description || '',
            pillar_id: data.idea.pillar_id || '',
            target_audience: data.idea.target_audience || '',
            source: data.idea.source || '',
            notes: data.idea.notes || '',
            status: data.idea.status || 'DRAFT',
          })
        }
      })
      .catch(console.error)
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/content-ideas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        router.push(`/content/ideas/${id}`)
      }
    } catch (error) {
      console.error('Failed to update idea:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Edit Idea</h1>
        <p className="mt-1 text-sm text-ink-secondary">Update content idea</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Idea Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Pillar</Label>
                <Select
                  value={form.pillar_id}
                  onChange={(e) => setForm({ ...form, pillar_id: e.target.value })}
                  className="w-full"
                >
                  <option value="">Select pillar</option>
                  {pillars.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full"
                >
                  {Object.entries(IDEA_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
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
                <Label>Source</Label>
                <Input
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !form.title}>
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
