'use client'

import { apiFetch } from '@/lib/api'
import { useState } from 'react'
import { useRouter } from '@/compat/next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangle } from 'lucide-react'
import type { ApprovalAction } from '@/types'
import { WORKFLOW_ACTIONS } from '@/constants/workflow'

interface WorkflowActionButtonProps {
  contentId: string
  action: ApprovalAction
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm'
  onDone?: () => void
  initialProductionLink?: string
}

export function WorkflowActionButton({
  contentId,
  action,
  variant,
  size = 'sm',
  onDone,
  initialProductionLink = '',
}: WorkflowActionButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [productionLink, setProductionLink] = useState(initialProductionLink)
  const [error, setError] = useState<string | null>(null)

  const def = WORKFLOW_ACTIONS[action]
  const requiresComment = def?.requiresComment ?? false
  const requiresProductionLink = def?.requiresProductionLink ?? false

  const effectiveVariant = variant ?? (action === 'REJECTED' ? 'destructive' : 'default')

  async function submit() {
    if (requiresComment && !comment.trim()) {
      setError('Catatan/komentar wajib diisi')
      return
    }
    if (requiresProductionLink && !productionLink.trim()) {
      setError('Tautan hasil produksi wajib diisi')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload: Record<string, any> = { action }
      if (comment.trim()) payload.comment = comment.trim()
      if (requiresProductionLink || productionLink.trim()) payload.production_link = productionLink.trim()

      const res = await apiFetch(`/api/contents/${contentId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Aksi gagal dilakukan')
        return
      }

      setDialogOpen(false)
      setComment('')
      if (onDone) onDone()
      else router.refresh()
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  function handleClick() {
    if (requiresComment || requiresProductionLink || action === 'REJECTED') {
      setDialogOpen(true)
    } else {
      submit()
    }
  }

  return (
    <>
      <Button variant={effectiveVariant} size={size} onClick={handleClick} disabled={loading}>
        {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        {def?.label ?? action}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={action === 'REJECTED' ? 'text-danger flex items-center gap-2' : ''}>
              {action === 'REJECTED' && <AlertTriangle className="h-5 w-5" />}
              {def?.label}
            </DialogTitle>
            <DialogDescription>
              {action === 'REJECTED'
                ? 'PERHATIAN: Penolakan bersifat final. Konten yang ditolak tidak dapat diubah lagi statusnya.'
                : requiresComment
                ? 'Catatan atau komentar wajib diisi untuk aksi ini dan akan tercatat secara permanen di riwayat alur kerja.'
                : requiresProductionLink
                ? 'Masukkan tautan hasil produksi (misal: Google Drive, Canva, Figma) untuk disetor ke Reviewer.'
                : 'Konfirmasi pelaksanaan aksi workflow ini.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {requiresProductionLink && (
              <div className="space-y-2">
                <Label htmlFor="prod-link">Tautan Hasil Produksi *</Label>
                <Input
                  id="prod-link"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={productionLink}
                  onChange={(e) => setProductionLink(e.target.value)}
                />
              </div>
            )}

            {(requiresComment || action === 'REJECTED') && (
              <div className="space-y-2">
                <Label htmlFor="comment">
                  {action === 'REJECTED' ? 'Alasan Penolakan *' : 'Komentar / Catatan Revisi *'}
                </Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    action === 'REJECTED'
                      ? 'Tuliskan alasan penolakan secara jelas...'
                      : 'Tuliskan alasan atau bagian yang perlu disesuaikan...'
                  }
                  rows={4}
                />
              </div>
            )}

            {error && <p className="text-sm font-medium text-danger">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button
              variant={effectiveVariant}
              onClick={submit}
              disabled={
                loading ||
                (requiresComment && !comment.trim()) ||
                (requiresProductionLink && !productionLink.trim())
              }
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {action === 'REJECTED' ? 'Ya, Tolak Konten' : 'Konfirmasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
