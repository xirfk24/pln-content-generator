'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'

interface MasterItem {
  id: string
  name: string
  description?: string | null
  icon?: string | null
}

interface MasterDataManagerProps {
  title: string
  description: string
  apiPath: string
  hasDescription?: boolean
}

export function MasterDataManager({
  title,
  description,
  apiPath,
  hasDescription = true,
}: MasterDataManagerProps) {
  const [items, setItems] = useState<MasterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<MasterItem | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/${apiPath}`)
      const data = await res.json()
      setItems(data.items || [])
      if (!res.ok) setError(data.error || 'Failed to load')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [apiPath])

  useEffect(() => {
    load()
  }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/${apiPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create')
        return
      }

      setAddOpen(false)
      setForm({ name: '', description: '' })
      load()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editItem) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/${apiPath}/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update')
        return
      }

      setEditItem(null)
      load()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item? It may be referenced by existing content.')) return

    try {
      const res = await fetch(`/api/admin/${apiPath}/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to delete')
        return
      }
      load()
    } catch {
      alert('Network error')
    }
  }

  function openEdit(item: MasterItem) {
    setEditItem(item)
    setForm({ name: item.name, description: item.description || '' })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        }
      />

      {error && (
        <div className="rounded-md border border-danger bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-ink-muted" aria-label="Loading" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-muted">
              No items yet. Click Add to create one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-surface-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Name</th>
                    {hasDescription && (
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Description</th>
                    )}
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-surface-muted/60">
                      <td className="px-4 py-3">
                        <Badge variant="outline">{item.name}</Badge>
                      </td>
                      {hasDescription && (
                        <td className="px-4 py-3 text-sm text-ink-secondary">
                          {item.description || '-'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Edit" aria-label={`Edit ${item.name}`}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Delete" aria-label={`Delete ${item.name}`}>
                            <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {title}</DialogTitle>
            <DialogDescription>Create a new item.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            {hasDescription && (
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !form.name}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {title}</DialogTitle>
            <DialogDescription>Update this item.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            {hasDescription && (
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !form.name}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
