'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Search, Eye, Edit, ArrowRight, Lightbulb, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { ContentIdea } from '@/types'

export default function ContentIdeasList() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    loadIdeas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter])

  async function loadIdeas() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/content-ideas?${params.toString()}`)
      const data = await res.json()
      setIdeas(data.ideas || [])
    } catch (error) {
      console.error('Failed to load ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" aria-label="Loading ideas" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <Input
                placeholder="Search ideas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                aria-label="Search ideas"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="sm:w-44"
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SELECTED">Selected</option>
              <option value="CONVERTED">Converted</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {ideas.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No content ideas found"
          description={
            search || statusFilter
              ? 'Try adjusting your search or filters.'
              : 'Capture your first idea and turn it into content.'
          }
          actionLabel="Create First Idea"
          actionHref="/content/ideas/new"
        />
      ) : (
        <div className="grid gap-4">
          {ideas.map((idea) => (
            <Card key={idea.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={idea.status} kind="idea" />
                      {idea.pillar && <Badge variant="outline">{idea.pillar.name}</Badge>}
                    </div>
                    <h3 className="mt-2 font-semibold text-ink">{idea.title}</h3>
                    {idea.description && (
                      <p className="mt-1 text-sm text-ink-secondary line-clamp-2">
                        {idea.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                      {idea.target_audience && <span>Target: {idea.target_audience}</span>}
                      <span>Created: {formatDate(idea.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    <Link href={`/content/ideas/${idea.id}`}>
                      <Button variant="ghost" size="icon" title="View idea" aria-label={`View ${idea.title}`}>
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Link>
                    <Link href={`/content/ideas/${idea.id}/edit`}>
                      <Button variant="ghost" size="icon" title="Edit idea" aria-label={`Edit ${idea.title}`}>
                        <Edit className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </Link>
                    {idea.status !== 'CONVERTED' && (
                      <form action={`/api/content-ideas/${idea.id}/convert`} method="POST">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Convert to content plan"
                          aria-label={`Convert ${idea.title} to content plan`}
                        >
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </form>
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
