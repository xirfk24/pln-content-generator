'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { Search, Eye, Edit, FileText, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { Content, Publication } from '@/types'

/** Ambil URL publikasi pertama yang published (kalau ada) */
function getPublishedUrl(content: Content): string | null {
  if (!content.publications || content.publications.length === 0) return null
  const published = content.publications.find(
    (p: Publication) => p.status === 'PUBLISHED' && p.url
  )
  return published?.url || null
}

export default function ContentPlanningList() {
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pillarFilter, setPillarFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [masterData, setMasterData] = useState<{
    pillars: Array<{ id: string; name: string }>
    platforms: Array<{ id: string; name: string }>
  }>({ pillars: [], platforms: [] })

  useEffect(() => {
    loadMasterData()
  }, [])

  useEffect(() => {
    loadContents()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, pillarFilter, platformFilter])

  async function loadMasterData() {
    try {
      const res = await fetch('/api/master-data')
      const data = await res.json()
      setMasterData({
        pillars: data.pillars || [],
        platforms: data.platforms || [],
      })
    } catch (error) {
      console.error('Failed to load master data:', error)
    }
  }

  async function loadContents() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (pillarFilter) params.set('pillar_id', pillarFilter)
      if (platformFilter) params.set('platform_id', platformFilter)
      
      const res = await fetch(`/api/contents?${params.toString()}`)
      const data = await res.json()
      setContents(data.contents || [])
    } catch (error) {
      console.error('Failed to load contents:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-ink-muted" aria-label="Loading content" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <Input
                placeholder="Search content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                aria-label="Search content"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-44"
                aria-label="Filter by status"
              >
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="READY_TO_PUBLISH">Ready to Publish</option>
                <option value="PUBLISHED">Published</option>
              </Select>
              <Select
                value={pillarFilter}
                onChange={(e) => setPillarFilter(e.target.value)}
                className="w-40"
                aria-label="Filter by pillar"
              >
                <option value="">All Pillars</option>
                {masterData.pillars.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
              <Select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="w-40"
                aria-label="Filter by platform"
              >
                <option value="">All Platforms</option>
                {masterData.platforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {contents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No content found"
          description={
            search || statusFilter || pillarFilter || platformFilter
              ? 'Try adjusting your search or filters.'
              : 'Start planning your first content.'
          }
          actionLabel="New Content"
          actionHref="/content/planning/new"
        />
      ) : (
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-muted">
              <tr>
                <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Week</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Day</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Date</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Kategori</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Platform</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Pillar</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Topic &amp; Title</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">PIC</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">Status</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contents.map((content) => {
                const day = (content as Content & { day?: string | null }).day
                return (
                  <tr key={content.id} className="transition-colors hover:bg-surface-muted/60">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {content.planned_week ?? '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {day || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {content.planned_date ? formatDate(content.planned_date) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {content.category?.name || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {content.platform?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="outline">{content.pillar?.name || '-'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {(() => {
                        const pubUrl = getPublishedUrl(content)
                        if (pubUrl) {
                          return (
                            <a
                              href={pubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-ink hover:text-primary hover:underline"
                            >
                              {content.title}
                            </a>
                          )
                        }
                        return (
                          <Link
                            href={`/content/${content.id}`}
                            className="font-medium text-ink hover:text-primary"
                          >
                            {content.title}
                          </Link>
                        )
                      })()}
                      <div className="text-xs text-ink-muted">{content.topic}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-ink-secondary">
                      {content.pic || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={content.status} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex justify-end gap-1">
                        <Link href={`/content/${content.id}`}>
                          <Button variant="ghost" size="icon" title="View content" aria-label={`View ${content.title}`}>
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </Link>
                        <Link href={`/content/${content.id}/edit`}>
                          <Button variant="ghost" size="icon" title="Edit content" aria-label={`Edit ${content.title}`}>
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      )}
    </div>
  )
}
