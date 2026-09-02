'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import type { ApprovalAction } from '@/types'
import { WORKFLOW_ACTIONS } from '@/constants/workflow'

interface WorkflowActionButtonProps {
  contentId: string
  action: ApprovalAction
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm'
  onDone?: () => void
}

export function WorkflowActionButton({
  contentId,
  action,
  variant = 'default',
  size = 'sm',
  onDone,
}: WorkflowActionButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const def = WORKFLOW_ACTIONS[action]
  const requiresComment = def?.requiresComment ?? false

  async function submit(withComment?: string) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/contents/${contentId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment: withComment }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Action failed')
        return
      }

      setDialogOpen(false)
      setComment('')
      if (onDone) onDone()
      else router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleClick() {
    if (requiresComment) {
      setDialogOpen(true)
    } else {
      submit()
    }
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={handleClick} disabled={loading}>
        {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        {def?.label ?? action}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{def?.label}</DialogTitle>
            <DialogDescription>
              A comment is required for this action. It will be recorded in the
              approval history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment *</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Explain what needs to change or why this is rejected..."
              rows={4}
            />
            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={() => submit(comment)}
              disabled={loading || !comment.trim()}
            >
              {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
