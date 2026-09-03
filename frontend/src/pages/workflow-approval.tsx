'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback } from 'react'
import Link from '@/compat/next'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Loader2, Eye, Inbox } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { WorkflowActionButton } from '@/components/workflow/workflow-action-button'
import type { Content } from '@/types'

export default function ApprovalPage() {
  const [queue, setQueue] = useState<Content[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastComments, setLastComments] = useState<Record<string, string>>({})

  const loadQueue = useCallback(async () => {
    try {
      const res = await apiFetch('/api/workflow/approval-queue')
      if (res.ok) {
        const data = await res.json()
        setQueue(data.queue || [])
        setRole(data.role || null)

        const comments: Record<string, string> = {}
        await Promise.all(
          (data.queue || []).map(async (c: Content) => {
            try {
              const histRes = await apiFetch(`/api/contents/${c.id}/details`)
              if (histRes.ok) {
                const histData = await histRes.json()
                const approvals = histData.approvals || []
                const last = approvals[approvals.length - 1]
                if (last?.comment) comments[c.id] = last.comment
              }
            } catch {
              // ignore individual failures
            }
          })
        )
        setLastComments(comments)
      }
    } catch (error) {
      console.error('Failed to load queue:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
      </div>
    )
  }

  const canReview = role === 'REVIEWER' || role === 'ADMIN'
  const canApprove = role === 'APPROVER' || role === 'ADMIN'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Approval Queue</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {role ? `Signed in as ${role}` : 'Content awaiting your action'}
        </p>
      </div>

      {!canReview && !canApprove ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="mx-auto mb-3 h-10 w-10 text-ink-muted" />
            <p className="text-ink-secondary">
              Your role does not have review or approval permissions.
            </p>
          </CardContent>
        </Card>
      ) : queue.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="mx-auto mb-3 h-10 w-10 text-ink-muted" />
            <p className="text-ink-secondary">Queue is empty. Nothing to review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {queue.map((content) => (
            <Card key={content.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={content.status} />
                      {content.pillar && (
                        <Badge variant="outline">{content.pillar.name}</Badge>
                      )}
                      {content.platform && (
                        <Badge variant="outline">{content.platform.name}</Badge>
                      )}
                      <Badge variant="outline">{content.format}</Badge>
                    </div>

                    <h3 className="mt-2 font-semibold text-ink">
                      {content.title}
                    </h3>
                    <p className="text-sm text-ink-secondary">{content.topic}</p>
                    {content.brief && (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-secondary">
                        {content.brief}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-secondary">
                      <span>PIC: {content.pic || '-'}</span>
                      <span>Planned: {formatDate(content.planned_date)}</span>
                    </div>

                    {lastComments[content.id] && (
                      <div className="mt-3 rounded-md bg-surface-muted p-2">
                        <p className="text-xs font-medium text-ink-secondary">
                          Latest workflow comment
                        </p>
                        <p className="text-xs text-ink-secondary">
                          {lastComments[content.id]}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 flex-wrap gap-2">
                    <Link href={`/content/${content.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-1 h-3 w-3" />
                        Detail
                      </Button>
                    </Link>

                    {content.status === 'PENDING_REVIEW' && canReview && (
                      <>
                        <WorkflowActionButton
                          contentId={content.id}
                          action="REVIEW_APPROVED"
                          variant="default"
                          onDone={loadQueue}
                        />
                        <WorkflowActionButton
                          contentId={content.id}
                          action="REVISION_REQUESTED"
                          variant="outline"
                          onDone={loadQueue}
                        />
                      </>
                    )}

                    {content.status === 'APPROVED' && canApprove && (
                      <>
                        <WorkflowActionButton
                          contentId={content.id}
                          action="FINAL_APPROVED"
                          variant="default"
                          onDone={loadQueue}
                        />
                        <WorkflowActionButton
                          contentId={content.id}
                          action="REJECTED"
                          variant="destructive"
                          onDone={loadQueue}
                        />
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
