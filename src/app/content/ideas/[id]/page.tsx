'use client'

import { useState, useEffect, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Loader2, Edit, ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { ContentIdea } from '@/types'

export default function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [idea, setIdea] = useState<ContentIdea | null>(null)
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    fetch(`/api/content-ideas/${id}`)
      .then(res => res.json())
      .then(data => setIdea(data.idea))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  async function handleConvert() {
    setConverting(true)
    try {
      const res = await fetch(`/api/content-ideas/${id}/convert`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        if (data.contentId) {
          window.location.href = `/content/${data.contentId}`
        }
      }
    } catch (error) {
      console.error('Failed to convert:', error)
    } finally {
      setConverting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
      </div>
    )
  }

  if (!idea) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-ink-secondary">Idea not found.</p>
          <Link href="/content/ideas" className="mt-4 inline-block">
            <Button variant="outline">Back to Ideas</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/content/ideas" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-ink-secondary">
          <ArrowLeft className="h-4 w-4" />
          Back to Ideas
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{idea.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge status={idea.status} kind="idea" />
          {idea.pillar && <Badge variant="outline">{idea.pillar.name}</Badge>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {idea.description && (
            <div>
              <p className="text-xs text-ink-secondary">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{idea.description}</p>
            </div>
          )}
          {idea.target_audience && (
            <div>
              <p className="text-xs text-ink-secondary">Target Audience</p>
              <p className="mt-1 text-sm">{idea.target_audience}</p>
            </div>
          )}
          {idea.source && (
            <div>
              <p className="text-xs text-ink-secondary">Source</p>
              <p className="mt-1 text-sm">{idea.source}</p>
            </div>
          )}
          {idea.notes && (
            <div>
              <p className="text-xs text-ink-secondary">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{idea.notes}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-ink-secondary">Created</p>
            <p className="mt-1 text-sm">{formatDate(idea.created_at)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href={`/content/ideas/${idea.id}/edit`} className="flex-1">
          <Button variant="outline" className="w-full">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
        {idea.status !== 'CONVERTED' && (
          <Button onClick={handleConvert} disabled={converting} className="flex-1">
            {converting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            Convert to Content
          </Button>
        )}
      </div>
    </div>
  )
}
