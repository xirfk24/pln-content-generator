'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useCallback } from 'react'
import Link from '@/compat/next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Loader2, Eye, Inbox, ShieldCheck } from 'lucide-react'
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
              // ignore
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
        <span className="ml-2 text-sm text-ink-secondary">Memuat antrean persetujuan...</span>
      </div>
    )
  }

  const isAdmin = role === 'ADMIN'

  return (
    <div className="space-y-6">
      {/* Banner Penjelasan Modul Konsisten */}
      <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50/90 to-blue-50/70 p-4.5 shadow-xs dark:border-purple-900/50 dark:from-purple-950/30 dark:to-blue-950/20">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-700 text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-purple-950 dark:text-purple-300">
              Persetujuan Konten (Approval Queue)
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Modul ini digunakan oleh Admin / Reviewer untuk meninjau, menyetujui, atau meminta revisi atas rencana konten yang diajukan sebelum masuk ke antrean publikasi.
            </p>
          </div>
        </div>
      </div>

      {!isAdmin ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="mx-auto mb-3 h-10 w-10 text-ink-muted" />
            <p className="text-ink-secondary font-medium">
              Role Anda (Staff) tidak memiliki akses untuk memberikan persetujuan konten.
            </p>
          </CardContent>
        </Card>
      ) : queue.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="mx-auto mb-3 h-10 w-10 text-ink-muted" />
            <p className="text-ink-secondary font-medium">Antrean persetujuan bersih. Tidak ada konten yang perlu ditinjau saat ini.</p>
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
                        <Badge variant="outline" className="text-xs">
                          {content.pillar.name}
                        </Badge>
                      )}
                      {content.platform && (
                        <Badge variant="secondary" className="text-xs">
                          {content.platform.name}
                        </Badge>
                      )}
                      <span className="text-xs text-ink-secondary">
                        Tgl Rencana: {formatDate(content.planned_date)}
                      </span>
                      {content.pic && (
                        <span className="text-xs text-ink-secondary">• PIC: {content.pic}</span>
                      )}
                    </div>

                    <h3 className="mt-2 font-semibold text-base text-ink">
                      <Link href={`/content/${content.id}`} className="hover:text-primary hover:underline">
                        {content.title}
                      </Link>
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">Topik: {content.topic}</p>

                    {content.brief && (
                      <p className="mt-2 line-clamp-2 text-sm text-ink-secondary leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded border">
                        {content.brief}
                      </p>
                    )}

                    {lastComments[content.id] && (
                      <div className="mt-2 rounded bg-surface-muted p-2 text-xs italic text-ink-secondary">
                        Catatan terakhir: &quot;{lastComments[content.id]}&quot;
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 lg:flex-col lg:items-end">
                    <Link href={`/content/${content.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        Lihat Detail
                      </Button>
                    </Link>

                    {content.status === 'PENDING_REVIEW' && (
                      <div className="flex gap-2">
                        <WorkflowActionButton
                          contentId={content.id}
                          action="APPROVED"
                          size="sm"
                          onDone={loadQueue}
                        />
                        <WorkflowActionButton
                          contentId={content.id}
                          action="REVISION_REQUESTED"
                          variant="outline"
                          size="sm"
                          onDone={loadQueue}
                        />
                      </div>
                    )}

                    {content.status === 'APPROVED' && (
                      <WorkflowActionButton
                        contentId={content.id}
                        action="FINAL_APPROVED"
                        size="sm"
                        onDone={loadQueue}
                      />
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
