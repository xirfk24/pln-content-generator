'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Loader2, Edit, ArrowLeft, ExternalLink } from 'lucide-react'
import Link from '@/compat/next'
import {
  ENGAGEMENT_FORMULA, CONTENT_PURPOSE_LABELS, POSTING_CATEGORY_LABELS,
} from '@/constants'
import { formatDate, formatDateTime, calculateEngagementRate } from '@/lib/utils'
import { WorkflowActionButton } from '@/components/workflow/workflow-action-button'
import { AIReviewPanel } from '@/components/ai/ai-review-panel'
import type { Content, Publication, ApprovalHistory } from '@/types'

type ContentWithPubs = Content & { publications: Publication[] }

const ACTION_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
  REVISION_REQUESTED: 'Revision Requested',
  REVIEW_APPROVED: 'Review Approved',
  FINAL_APPROVED: 'Final Approved',
  REJECTED: 'Rejected',
  RESUBMITTED: 'Resubmitted',
}

export default function ContentDetailPage() {
  const { id } = useParams()
  const [content, setContent] = useState<ContentWithPubs | null>(null)
  const [approvals, setApprovals] = useState<ApprovalHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await apiFetch(`/api/contents/${id}/details`)
      if (res.ok) {
        const data = await res.json()
        setContent(data.content)
        setApprovals(data.approvals || [])
      }
    } catch (error) {
      console.error('Failed to load content:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user?.profile?.role && setUserRole(data.user.profile.role))
      .catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
      </div>
    )
  }

  if (!content) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-ink-secondary">Content not found.</p>
          <Link href="/content/planning" className="mt-4 inline-block">
            <Button variant="outline">Back to Planning</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/content/planning" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-ink-secondary">
            <ArrowLeft className="h-4 w-4" />
            Back to Planning
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{content.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={content.status} />
            {content.pillar && <Badge variant="outline">Tema: {content.pillar.name}</Badge>}
            {content.platform && <Badge variant="outline">{content.platform.name}</Badge>}
            <Badge variant="outline">{content.format}</Badge>
          </div>
        </div>
        <Link href={`/content/${content.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                  <dt className="text-xs text-ink-secondary">Topic</dt>
                  <dd className="text-sm font-medium">{content.topic}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">PIC</dt>
                  <dd className="text-sm font-medium">{content.pic || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Priority</dt>
                  <dd className="text-sm font-medium">{content.priority || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Planned Date</dt>
                  <dd className="text-sm font-medium">{formatDate(content.planned_date)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Week</dt>
                  <dd className="text-sm font-medium">{content.planned_week || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Target Audience</dt>
                  <dd className="text-sm font-medium">{content.target_audience || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Content Purpose</dt>
                  <dd className="text-sm font-medium">
                    {content.content_purpose ? (CONTENT_PURPOSE_LABELS[content.content_purpose] ?? content.content_purpose) : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-secondary">Posting Category</dt>
                  <dd className="text-sm font-medium">
                    {content.posting_category ? (POSTING_CATEGORY_LABELS[content.posting_category] ?? content.posting_category) : '-'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brief</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-ink-secondary">
                {content.brief || 'No brief provided.'}
              </p>
              {(() => {
                const c = content as Content & { reference?: string | null; brief_link?: string | null; result_link?: string | null }
                const links = [
                  { label: 'Reference', url: c.reference },
                  { label: 'Brief Link', url: c.brief_link },
                  { label: 'Result Link', url: c.result_link },
                ].filter(l => l.url && l.url.trim() !== '')
                if (links.length === 0) return null
                return (
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-muted">Links</p>
                    <div className="space-y-2">
                      {links.map((l) => (
                        <a key={l.label} href={l.url!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-medium">{l.label}:</span>
                          <span className="truncate">{l.url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Review</CardTitle>
            </CardHeader>
            <CardContent>
              <AIReviewPanel
                content={content.brief || ''}
                platform={content.platform?.name || 'Instagram'}
                targetAudience={content.target_audience}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publications</CardTitle>
            </CardHeader>
            <CardContent>
              {(!content.publications || content.publications.length === 0) ? (
                <p className="text-sm text-ink-secondary">No publications yet.</p>
              ) : (
                <div className="space-y-4">
                  {content.publications.map((pub) => {
                    const metrics = pub.performance_metrics?.[0]
                    const engagement = metrics ? calculateEngagementRate(metrics) : null
                    return (
                      <div key={pub.id} className="rounded-lg border p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pub.platform?.name || '-'}</span>
                            <StatusBadge status={pub.status} kind="publication" />
                          </div>
                          {pub.url && (
                            <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink-secondary md:grid-cols-4">
                          <div>Planned: {formatDate(pub.planned_publish_date)}</div>
                          <div>Actual: {formatDate(pub.actual_publish_date)}</div>
                        </div>
                        {metrics && (
                          <div className="mt-3 border-t pt-3">
                            <div className="grid grid-cols-3 gap-2 text-xs md:grid-cols-6">
                              <div><span className="text-ink-secondary">Views:</span> {metrics.views.toLocaleString()}</div>
                              <div><span className="text-ink-secondary">Likes:</span> {metrics.likes.toLocaleString()}</div>
                              <div><span className="text-ink-secondary">Comments:</span> {metrics.comments.toLocaleString()}</div>
                              <div><span className="text-ink-secondary">Shares:</span> {metrics.shares.toLocaleString()}</div>
                              <div><span className="text-ink-secondary">Saves:</span> {metrics.saves.toLocaleString()}</div>
                              <div><span className="text-ink-secondary">Reach:</span> {metrics.reach.toLocaleString()}</div>
                            </div>
                            {engagement !== null && (
                              <div className="mt-2 text-xs">
                                <span className="font-medium text-success">
                                  Engagement Rate: {engagement.toFixed(2)}%
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="mt-4 text-xs text-ink-muted">{ENGAGEMENT_FORMULA}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {['DRAFT', 'PLANNED', 'IN_PROGRESS'].includes(content.status) &&
                  (userRole === 'ADMIN' || userRole === 'STAFF') && (
                    <WorkflowActionButton
                      contentId={content.id}
                      action="SUBMITTED"
                      size="default"
                      onDone={load}
                    />
                  )}

                {content.status === 'REVISION_REQUIRED' &&
                  (userRole === 'ADMIN' || userRole === 'STAFF') && (
                    <>
                      <Link href={`/content/${content.id}/edit`}>
                        <Button variant="outline">Edit Content</Button>
                      </Link>
                      <WorkflowActionButton
                        contentId={content.id}
                        action="RESUBMITTED"
                        size="default"
                        onDone={load}
                      />
                    </>
                  )}

                {content.status === 'PENDING_REVIEW' && userRole === 'ADMIN' && (
                    <>
                      <WorkflowActionButton
                        contentId={content.id}
                        action="APPROVED"
                        size="default"
                        onDone={load}
                      />
                      <WorkflowActionButton
                        contentId={content.id}
                        action="REVISION_REQUESTED"
                        variant="outline"
                        size="default"
                        onDone={load}
                      />
                    </>
                  )}

                {content.status === 'APPROVED' && userRole === 'ADMIN' && (
                    <>
                      <WorkflowActionButton
                        contentId={content.id}
                        action="FINAL_APPROVED"
                        size="default"
                        onDone={load}
                      />
                      <WorkflowActionButton
                        contentId={content.id}
                        action="REJECTED"
                        variant="destructive"
                        size="default"
                        onDone={load}
                      />
                    </>
                  )}

                {content.status === 'READY_TO_PUBLISH' && (
                  <Link href="/publishing">
                    <Button size="default">Record Publication</Button>
                  </Link>
                )}

                {['PUBLISHED', 'NOT_REALIZED'].includes(content.status) && (
                  <p className="text-sm text-ink-secondary">
                    Lifecycle complete — no further actions.
                  </p>
                )}

                {content.status === 'PENDING_REVIEW' && userRole !== 'ADMIN' && (
                    <p className="text-sm text-ink-secondary">Waiting for approval.</p>
                  )}

                {content.status === 'APPROVED' && userRole !== 'ADMIN' && (
                    <p className="text-sm text-ink-secondary">Waiting for final approval.</p>
                  )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {approvals.length === 0 ? (
                <p className="text-sm text-ink-secondary">No approval history yet.</p>
              ) : (
                <div className="space-y-0">
                  {approvals.map((approval, index) => (
                    <div key={approval.id} className="relative flex gap-3 pb-6 last:pb-0">
                      {index < approvals.length - 1 && (
                        <div className="absolute left-[7px] top-5 h-full w-px bg-border-strong" />
                      )}
                      <div className={`relative mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 ${
                        approval.action.includes('APPROVED') ? 'border-success bg-success' :
                        approval.action.includes('REJECTED') ? 'border-danger bg-danger' :
                        approval.action.includes('REVISION') ? 'border-warning bg-warning' :
                        'border-primary bg-primary'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {ACTION_LABELS[approval.action] || approval.action}
                        </p>
                        <p className="text-xs text-ink-secondary">
                          by {approval.performer?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {formatDateTime(approval.performed_at)}
                        </p>
                        {approval.comment && (
                          <p className="mt-1 rounded bg-surface-muted p-2 text-xs text-ink-secondary">
                            {approval.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
