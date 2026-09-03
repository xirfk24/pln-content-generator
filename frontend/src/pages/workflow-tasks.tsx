'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback } from 'react'
import Link from '@/compat/next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Eye, FileEdit, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { WorkflowActionButton } from '@/components/workflow/workflow-action-button'
import { StatusBadge } from '@/components/ui/status-badge'
import type { Content } from '@/types'

interface TaskGroups {
  drafts: Content[]
  revisions: Content[]
  readyToPublish: Content[]
  submitted: Content[]
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskGroups | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTasks = useCallback(async () => {
    try {
      const res = await apiFetch('/api/workflow/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
      </div>
    )
  }

  if (!tasks) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-ink-secondary">
          Failed to load tasks.
        </CardContent>
      </Card>
    )
  }

  const groups = [
    {
      key: 'revisions' as const,
      title: 'Needs Revision',
      description: 'Feedback received — update content and resubmit.',
      icon: AlertCircle,
      iconColor: 'text-warning',
      items: tasks.revisions,
      actions: (c: Content) => (
        <div className="flex gap-2">
          <Link href={`/content/${c.id}/edit`}>
            <Button variant="outline" size="sm">
              <FileEdit className="mr-1 h-3 w-3" />
              Edit
            </Button>
          </Link>
          <WorkflowActionButton
            contentId={c.id}
            action="RESUBMITTED"
            onDone={loadTasks}
          />
        </div>
      ),
    },
    {
      key: 'drafts' as const,
      title: 'Working Drafts',
      description: 'Draft, planned, or in-progress content you created.',
      icon: FileEdit,
      iconColor: 'text-primary',
      items: tasks.drafts,
      actions: (c: Content) => (
        <div className="flex gap-2">
          <Link href={`/content/${c.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="mr-1 h-3 w-3" />
              View
            </Button>
          </Link>
          {['DRAFT', 'PLANNED', 'IN_PROGRESS'].includes(c.status) && (
            <WorkflowActionButton
              contentId={c.id}
              action="SUBMITTED"
              onDone={loadTasks}
            />
          )}
        </div>
      ),
    },
    {
      key: 'submitted' as const,
      title: 'Waiting for Review/Approval',
      description: 'Submitted — awaiting reviewer or approver action.',
      icon: Clock,
      iconColor: 'text-ink-muted',
      items: tasks.submitted,
      actions: (c: Content) => (
        <Link href={`/content/${c.id}`}>
          <Button variant="ghost" size="sm">
            <Eye className="mr-1 h-3 w-3" />
            View
          </Button>
        </Link>
      ),
    },
    {
      key: 'readyToPublish' as const,
      title: 'Ready to Publish',
      description: 'Approved — record publications on the Publishing Tracker.',
      icon: CheckCircle2,
      iconColor: 'text-success',
      items: tasks.readyToPublish,
      actions: (c: Content) => (
        <div className="flex gap-2">
          <Link href={`/content/${c.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="mr-1 h-3 w-3" />
              View
            </Button>
          </Link>
          <Link href="/publishing">
            <Button size="sm">Record Publication</Button>
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">My Tasks</h1>
        <p className="mt-1 text-sm text-ink-secondary">Content items that need your attention</p>
      </div>

      {groups.map((group) => (
        <Card key={group.key}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <group.icon className={`h-5 w-5 ${group.iconColor}`} />
              <CardTitle className="text-base">
                {group.title}
                <span className="ml-2 text-sm font-normal text-ink-secondary">
                  ({group.items.length})
                </span>
              </CardTitle>
            </div>
            <p className="text-sm text-ink-secondary">{group.description}</p>
          </CardHeader>
          <CardContent>
            {group.items.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-muted">
                Nothing here. Good job!
              </p>
            ) : (
              <div className="divide-y">
                {group.items.map((content) => (
                  <div
                    key={content.id}
                    className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {content.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
                        <StatusBadge status={content.status} />
                        {content.pillar && <span>{content.pillar.name}</span>}
                        {content.platform && <span>{content.platform.name}</span>}
                        <span>Due: {formatDate(content.planned_date)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">{group.actions(content)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
