'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback } from 'react'
import Link from '@/compat/next'
import { Card, CardContent } from '@/components/ui/card'
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
import { Loader2, Plus, ExternalLink, Pencil, Trash2, BarChart3 } from 'lucide-react'
import { PUBLICATION_STATUS_LABELS, PUBLICATION_STATUSES, ENGAGEMENT_FORMULA } from '@/constants'
import { StatusBadge } from '@/components/ui/status-badge'
import { Select } from '@/components/ui/select'
import { formatDate, calculateEngagementRate } from '@/lib/utils'
import type { Publication, Content, Platform, PerformanceMetric } from '@/types'

interface PublicationRow extends Publication {
  content?: Pick<Content, 'id' | 'title' | 'topic' | 'status' | 'pic'>
}

export default function PublishingPage() {
  const [publications, setPublications] = useState<PublicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [contents, setContents] = useState<Content[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [editPub, setEditPub] = useState<PublicationRow | null>(null)
  const [metricsPub, setMetricsPub] = useState<PublicationRow | null>(null)
  const [addForm, setAddForm] = useState({
    content_id: '',
    platform_id: '',
    planned_publish_date: '',
    notes: '',
  })
  const [editForm, setEditForm] = useState({
    platform_id: '',
    planned_publish_date: '',
    actual_publish_date: '',
    url: '',
    status: 'PLANNED',
    notes: '',
  })
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
      const res = await apiFetch(`/api/publications?${params.toString()}`)
      const data = await res.json()
      setPublications(data.publications || [])
    } catch (err) {
      console.error('Failed to load publications:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadPublications()
  }, [loadPublications])

  useEffect(() => {
    apiFetch('/api/master-data')
      .then((res) => res.json())
      .then((data) => setPlatforms(data.platforms || []))
      .catch(console.error)

    apiFetch('/api/contents?status=READY_TO_PUBLISH')
      .then((res) => res.json())
      .then((data) => setContents(data.contents || []))
      .catch(console.error)
    apiFetch('/api/contents?status=APPROVED')
      .then((res) => res.json())
      .then((data) =>
        setContents((prev) => {
          const ids = new Set(prev.map((c) => c.id))
          return [...prev, ...(data.contents || []).filter((c: Content) => !ids.has(c.id))]
        })
      )
      .catch(console.error)
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await apiFetch('/api/publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_id: addForm.content_id,
          platform_id: addForm.platform_id || undefined,
          planned_publish_date: addForm.planned_publish_date || undefined,
          notes: addForm.notes || undefined,
          status: 'PLANNED',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to add publication')
        return
      }

      setAddOpen(false)
      setAddForm({ content_id: '', platform_id: '', planned_publish_date: '', notes: '' })
      loadPublications()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(pub: PublicationRow) {
    setEditPub(pub)
    setEditForm({
      platform_id: pub.platform_id || '',
      planned_publish_date: pub.planned_publish_date || '',
      actual_publish_date: pub.actual_publish_date || '',
      url: pub.url || '',
      status: pub.status,
      notes: pub.notes || '',
    })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editPub) return
    setSaving(true)
    setError(null)

    try {
      const res = await apiFetch(`/api/publications/${editPub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform_id: editForm.platform_id || undefined,
          planned_publish_date: editForm.planned_publish_date || null,
          actual_publish_date: editForm.actual_publish_date || null,
          url: editForm.url || null,
          status: editForm.status,
          notes: editForm.notes || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update publication')
        return
      }

      setEditPub(null)
      loadPublications()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this publication?')) return
    try {
      await apiFetch(`/api/publications/${id}`, { method: 'DELETE' })
      loadPublications()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  function quickMarkPublished(pub: PublicationRow) {
    const today = new Date().toISOString().split('T')[0]
    openEdit({ ...pub })
    setEditForm({
      platform_id: pub.platform_id || '',
      planned_publish_date: pub.planned_publish_date || '',
      actual_publish_date: today,
      url: pub.url || '',
      status: 'PUBLISHED',
      notes: pub.notes || '',
    })
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
        setError(data.error || 'Failed to save metrics')
        return
      }

      setMetricsPub(null)
      loadPublications()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const previewEngagement = calculateEngagementRate({
    likes: Number(metricsForm.likes) || 0,
    comments: Number(metricsForm.comments) || 0,
    shares: Number(metricsForm.shares) || 0,
    saves: Number(metricsForm.saves) || 0,
    reach: Number(metricsForm.reach) || 0,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Publishing Tracker</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Track content publications across platforms
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Publication
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              <option value="">All Status</option>
              {PUBLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PUBLICATION_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
        </div>
      ) : publications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-ink-secondary">
            No publications found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-surface-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Content</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Planned</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Actual</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">URL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {publications.map((pub) => {
                  const isDelayed =
                    pub.status !== 'PUBLISHED' &&
                    pub.status !== 'CANCELLED' &&
                    pub.planned_publish_date &&
                    new Date(pub.planned_publish_date) < new Date()

                  return (
                    <tr key={pub.id} className="hover:bg-surface-muted">
                      <td className="px-4 py-3">
                        {pub.content ? (
                          <Link
                            href={`/content/${pub.content.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {pub.content.title}
                          </Link>
                        ) : (
                          <span className="text-ink-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-secondary">
                        {pub.platform?.name || '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {formatDate(pub.planned_publish_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {pub.actual_publish_date ? (
                          <span
                            className={
                              pub.planned_publish_date &&
                              pub.actual_publish_date > pub.planned_publish_date
                                ? 'text-warning'
                                : 'text-success'
                            }
                          >
                            {formatDate(pub.actual_publish_date)}
                          </span>
                        ) : (
                          <span className={isDelayed ? 'text-danger' : 'text-ink-muted'}>
                            {isDelayed ? 'Overdue' : '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {pub.url ? (
                          <a
                            href={pub.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline"
                          >
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Link
                          </a>
                        ) : (
                          <span className="text-ink-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={pub.status} kind="publication" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {pub.status === 'PLANNED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => quickMarkPublished(pub)}
                              title="Mark as published"
                            >
                              Publish
                            </Button>
                          )}
                          {pub.status === 'PUBLISHED' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openMetrics(pub)}
                              title="Input performance metrics"
                            >
                              <BarChart3 className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(pub)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(pub.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-danger" />
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

      {/* Add Publication Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Publication</DialogTitle>
            <DialogDescription>
              Schedule approved content for publishing on a platform.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Content *</Label>
              <Select
                value={addForm.content_id}
                onChange={(e) => setAddForm({ ...addForm, content_id: e.target.value })}
                className="w-full"
                required
              >
                <option value="">Select content (approved / ready to publish)</option>
                {contents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={addForm.platform_id}
                  onChange={(e) => setAddForm({ ...addForm, platform_id: e.target.value })}
                  className="w-full"
                >
                  <option value="">Select platform</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Planned Date</Label>
                <Input
                  type="date"
                  value={addForm.planned_publish_date}
                  onChange={(e) =>
                    setAddForm({ ...addForm, planned_publish_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={addForm.notes}
                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !addForm.content_id}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Add Publication
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Publication Dialog */}
      <Dialog open={!!editPub} onOpenChange={(open) => !open && setEditPub(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Publication</DialogTitle>
            <DialogDescription>
              Update publication status, dates, and URL.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select
                  value={editForm.platform_id}
                  onChange={(e) => setEditForm({ ...editForm, platform_id: e.target.value })}
                  className="w-full"
                >
                  <option value="">Select platform</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full"
                >
                  {PUBLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PUBLICATION_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Planned Date</Label>
                <Input
                  type="date"
                  value={editForm.planned_publish_date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, planned_publish_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Actual Publish Date</Label>
                <Input
                  type="date"
                  value={editForm.actual_publish_date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, actual_publish_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                type="url"
                value={editForm.url}
                onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditPub(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Metrics Dialog */}
      <Dialog open={!!metricsPub} onOpenChange={(open) => !open && setMetricsPub(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Performance Metrics</DialogTitle>
            <DialogDescription>
              {metricsPub?.content?.title
                ? `${metricsPub.content.title} — ${metricsPub.platform?.name || ''}`
                : 'Record metrics for this publication.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMetrics} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Views</Label>
                <Input
                  type="number"
                  min={0}
                  value={metricsForm.views}
                  onChange={(e) => setMetricsForm({ ...metricsForm, views: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Likes</Label>
                <Input
                  type="number"
                  min={0}
                  value={metricsForm.likes}
                  onChange={(e) => setMetricsForm({ ...metricsForm, likes: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Comments</Label>
                <Input
                  type="number"
                  min={0}
                  value={metricsForm.comments}
                  onChange={(e) => setMetricsForm({ ...metricsForm, comments: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Shares</Label>
                <Input
                  type="number"
                  min={0}
                  value={metricsForm.shares}
                  onChange={(e) => setMetricsForm({ ...metricsForm, shares: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Saves</Label>
                <Input
                  type="number"
                  min={0}
                  value={metricsForm.saves}
                  onChange={(e) => setMetricsForm({ ...metricsForm, saves: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Reach</Label>
                <Input
                  type="number"
                  min={0}
                  value={metricsForm.reach}
                  onChange={(e) => setMetricsForm({ ...metricsForm, reach: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Recorded At</Label>
              <Input
                type="date"
                value={metricsForm.recorded_at}
                onChange={(e) =>
                  setMetricsForm({ ...metricsForm, recorded_at: e.target.value })
                }
              />
              <p className="text-xs text-ink-muted">
                Existing metrics for the same date will be updated.
              </p>
            </div>

            <div className="rounded-md bg-primary-soft p-3">
              <p className="text-sm">
                <span className="font-medium text-primary">
                  Engagement Rate: {previewEngagement.toFixed(2)}%
                </span>
              </p>
              <p className="mt-1 text-xs text-primary">{ENGAGEMENT_FORMULA}</p>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMetricsPub(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Save Metrics
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
