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
import { SkeletonTable } from '@/components/ui/skeleton'
import type { Content, Publication } from '@/types'

/** Ambil URL publikasi pertama yang published (kalau ada) */
function getPublishedUrl(content: Content): string | null {
  if (!content.publications || content.publications.length === 0) return null
  const published = content.publications.find(
    (p: Publication) => p.status === 'PUBLISHED' && p.url
  )
  return published?.url || null
}

const TH_BASE =
  'whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-secondary'

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

  const hasFilters = search || statusFilter || pillarFilter || platformFilter

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
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-44"
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
                className="w-full sm:w-40"
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
                className="w-full sm:w-40"
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

      {loading ? (
        <Card>
          <div className="flex items-center justify-center border-b border-border py-3" role="status" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin text-ink-muted" aria-hidden="true" />
            <span className="ml-2 text-sm text-ink-secondary">Loading content...</span>
          </div>
          <div className="p-4">
            <SkeletonTable rows={6} cols={5} />
          </div>
        </Card>
      ) : contents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No content found"
          description={
            hasFilters
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
            <caption className="sr-only">
              Content plan list with week, day, date, category, platform, pillar, topic, PIC,
              status, and actions
            </caption>
            <thead className="border-b border-border bg-surface-muted">
              <tr>
                <th scope="col" className={`hidden md:table-cell ${TH_BASE}`}>Week</th>
                <th scope="col" className={`hidden md:table-cell ${TH_BASE}`}>Day</th>
                <th scope="col" className={TH_BASE}>Date</th>
                <th scope="col" className={TH_BASE}>Kategori</th>
                <th scope="col" className={TH_BASE}>Platform</th>
                <th scope="col" className={`hidden lg:table-cell ${TH_BASE}`}>Pillar</th>
                <th scope="col" className={TH_BASE}>Topic &amp; Title</th>
                <th scope="col" className={`hidden md:table-cell ${TH_BASE}`}>PIC</th>
                <th scope="col" className={TH_BASE}>Status</th>
                <th scope="col" className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contents.map((content) => {
                const day = (content as Content & { day?: string | null }).day
                return (
                  <tr key={content.id} className="transition-colors hover:bg-surface-muted/60">
                    <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-ink-secondary md:table-cell">
                      {content.planned_week ?? '-'}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-ink-secondary md:table-cell">
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
                    <td className="hidden px-4 py-3 text-sm lg:table-cell">
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
                    <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-ink-secondary md:table-cell">
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
