'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Plus, Pencil, Trash2, ClipboardList, CheckCircle, AlertCircle } from 'lucide-react'

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

interface BulkResult {
  added: number
  skipped: string[]
  errors: string[]
}

/** Parse textarea lines into { name, description } pairs.
 *  Supports two formats per line:
 *    "Nama Tema"
 *    "Nama Tema | Deskripsi tema"
 */
function parseBulkLines(text: string): Array<{ name: string; description: string }> {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const pipeIdx = line.indexOf('|')
      if (pipeIdx !== -1) {
        return {
          name: line.slice(0, pipeIdx).trim(),
          description: line.slice(pipeIdx + 1).trim(),
        }
      }
      return { name: line, description: '' }
    })
    .filter((item) => item.name.length > 0)
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

  // Single add
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<MasterItem | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })

  // Bulk add
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkProgress, setBulkProgress] = useState<BulkResult | null>(null)
  const [bulkRunning, setBulkRunning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/admin/${apiPath}`)
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

  // ── Single add ──────────────────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/admin/${apiPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create'); return }
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
      const res = await apiFetch(`/api/admin/${apiPath}/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to update'); return }
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
      const res = await apiFetch(`/api/admin/${apiPath}/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to delete'); return }
      load()
    } catch {
      alert('Network error')
    }
  }

  function openEdit(item: MasterItem) {
    setEditItem(item)
    setForm({ name: item.name, description: item.description || '' })
  }

  // ── Bulk add ────────────────────────────────────────────────────────────────

  const bulkLines = parseBulkLines(bulkText)
  const existingNames = new Set(items.map((i) => i.name.toLowerCase()))

  async function handleBulkAdd() {
    if (bulkLines.length === 0) return
    setBulkRunning(true)
    setBulkProgress(null)

    const result: BulkResult = { added: 0, skipped: [], errors: [] }

    for (const { name, description: desc } of bulkLines) {
      // Skip duplicates client-side to reduce unnecessary API calls
      if (existingNames.has(name.toLowerCase())) {
        result.skipped.push(name)
        continue
      }
      try {
        const res = await apiFetch(`/api/admin/${apiPath}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description: desc }),
        })
        if (res.ok) {
          result.added++
          existingNames.add(name.toLowerCase())
        } else {
          const d = await res.json()
          result.errors.push(`${name}: ${d.error || 'failed'}`)
        }
      } catch {
        result.errors.push(`${name}: network error`)
      }
    }

    setBulkProgress(result)
    setBulkRunning(false)
    if (result.added > 0) load()
  }

  function closeBulk() {
    setBulkOpen(false)
    setBulkText('')
    setBulkProgress(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <ClipboardList className="mr-2 h-4 w-4" aria-hidden="true" />
              Bulk Add
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add
            </Button>
          </div>
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
              No items yet. Click Add or Bulk Add to create.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <caption className="sr-only">{title} list</caption>
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

      {/* ── Single Add Dialog ── */}
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
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.name}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
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
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.name}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Add Dialog ── */}
      <Dialog open={bulkOpen} onOpenChange={(open) => { if (!open) closeBulk() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Add {title}</DialogTitle>
            <DialogDescription>
              Paste banyak nama sekaligus — satu baris satu item.
              {hasDescription && (
                <> Untuk tambah deskripsi, gunakan format: <code className="rounded bg-surface-muted px-1 text-xs">Nama | Deskripsi</code></>
              )}
            </DialogDescription>
          </DialogHeader>

          {!bulkProgress ? (
            <div className="space-y-4">
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={
                  hasDescription
                    ? `Contoh:\nA - Bencana & Pemulihan | Penanganan bencana\nB - TJSL | Tanggung Jawab Sosial\nC - EV/SPKLU`
                    : `Contoh:\nInstagram\nTikTok\nFacebook`
                }
                rows={10}
                className="font-mono text-sm"
              />

              {bulkLines.length > 0 && (
                <div className="rounded-md bg-surface-muted px-4 py-2 text-sm">
                  <span className="font-medium text-ink">{bulkLines.length} item</span>
                  <span className="text-ink-muted"> siap ditambahkan</span>
                  {bulkLines.filter(l => existingNames.has(l.name.toLowerCase())).length > 0 && (
                    <span className="ml-2 text-warning">
                      ({bulkLines.filter(l => existingNames.has(l.name.toLowerCase())).length} duplikat akan dilewati)
                    </span>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeBulk}>Cancel</Button>
                <Button
                  onClick={handleBulkAdd}
                  disabled={bulkRunning || bulkLines.length === 0}
                >
                  {bulkRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {bulkRunning ? 'Menambahkan...' : `Tambah ${bulkLines.length} Item`}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">{bulkProgress.added} item berhasil ditambahkan</span>
                </div>
                {bulkProgress.skipped.length > 0 && (
                  <div className="flex items-start gap-2 text-warning">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{bulkProgress.skipped.length} duplikat dilewati:</p>
                      <p className="text-sm text-ink-muted">{bulkProgress.skipped.join(', ')}</p>
                    </div>
                  </div>
                )}
                {bulkProgress.errors.length > 0 && (
                  <div className="flex items-start gap-2 text-danger">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{bulkProgress.errors.length} gagal:</p>
                      <ul className="text-sm text-ink-muted">
                        {bulkProgress.errors.map((e, i) => <li key={i}>{e}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setBulkProgress(null); setBulkText('') }}>
                  Tambah Lagi
                </Button>
                <Button onClick={closeBulk}>Selesai</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
