'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

export default function NewContentIdeaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [pillars, setPillars] = useState<{id: string; name: string}[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    pillar_id: '',
    target_audience: '',
    source: '',
    notes: '',
  })

  useEffect(() => {
    fetch('/api/master-data')
      .then(res => res.json())
      .then(data => setPillars(data.pillars || []))
      .catch(console.error)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/content-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        router.push('/content/ideas')
      }
    } catch (error) {
      console.error('Failed to create idea:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">New Content Idea</h1>
        <p className="mt-1 text-sm text-ink-secondary">Create a new content idea</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Idea Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Enter idea title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pillar">Pillar</Label>
              <Select
                id="pillar"
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your content idea"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_audience">Target Audience</Label>
              <Input
                id="target_audience"
                value={form.target_audience}
                onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                placeholder="e.g., Masyarakat usia 25-45 tahun"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="e.g., Team brainstorming, Customer feedback"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !form.title}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Idea
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
