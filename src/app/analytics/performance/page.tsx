'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FilterBar, EMPTY_FILTERS, type FilterValues } from '@/components/analytics/filter-bar'
import { SkeletonTable } from '@/components/ui/skeleton'
import { ENGAGEMENT_FORMULA } from '@/constants'

type RankMetric = 'views' | 'engagementRate' | 'likes' | 'shares'

interface TopContentRow {
  contentId: string
  title: string
  platform: string
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  engagementRate: number
}

const METRIC_OPTIONS: Array<{ value: RankMetric; label: string }> = [
  { value: 'views', label: 'Views' },
  { value: 'engagementRate', label: 'Engagement Rate' },
  { value: 'likes', label: 'Likes' },
  { value: 'shares', label: 'Shares' },
]

export default function PerformanceAnalyticsPage() {
  const [rows, setRows] = useState<TopContentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS)
  const [rankMetric, setRankMetric] = useState<RankMetric>('views')
  const [masterData, setMasterData] = useState<{
    pillars: Array<{ id: string; name: string }>
    platforms: Array<{ id: string; name: string }>
  }>({ pillars: [], platforms: [] })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, v))
      params.set('metric', rankMetric)
      const res = await fetch(`/api/analytics?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.topContent || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [filters, rankMetric])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetch('/api/master-data')
      .then((r) => r.json())
      .then((d) => setMasterData({ pillars: d.pillars || [], platforms: d.platforms || [] }))
      .catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Performance Analytics</h1>
        <p className="mt-1 text-sm text-ink-secondary">Top performing content ranking</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              masterData={masterData}
              showStatus={false}
            />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-ink-secondary">Rank by</span>
              <div className="flex flex-wrap gap-1">
                {METRIC_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRankMetric(opt.value)}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                      rankMetric === opt.value
                        ? 'bg-primary-soft text-primary font-medium'
                        : 'bg-surface-muted text-ink-secondary hover:bg-surface-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Content</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-1">
              <SkeletonTable rows={6} cols={6} />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-muted">
              No performance data recorded yet. Add metrics in Publishing Tracker.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <caption className="sr-only">
                  Top content ranked by {rankMetric} with views, likes, comments, shares, saves,
                  reach, and engagement rate
                </caption>
                <thead className="border-b bg-surface-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">#</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Title</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-ink-secondary">Platform</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Views</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Likes</th>
                    <th scope="col" className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary md:table-cell">Comments</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Shares</th>
                    <th scope="col" className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary md:table-cell">Saves</th>
                    <th scope="col" className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary md:table-cell">Reach</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-ink-secondary">Eng. Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row, i) => (
                    <tr key={row.contentId} className="hover:bg-surface-muted">
                      <td className="px-4 py-3">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            i === 0
                              ? 'bg-warning-soft text-warning'
                              : i === 1
                                ? 'bg-primary-soft text-primary'
                                : i === 2
                                  ? 'bg-info-soft text-info'
                                  : 'bg-surface-muted text-ink-muted'
                          }`}
                          aria-hidden="true"
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/content/${row.contentId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{row.platform}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">{row.views.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm">{row.likes.toLocaleString()}</td>
                      <td className="hidden px-4 py-3 text-right text-sm md:table-cell">{row.comments.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm">{row.shares.toLocaleString()}</td>
                      <td className="hidden px-4 py-3 text-right text-sm md:table-cell">{row.saves.toLocaleString()}</td>
                      <td className="hidden px-4 py-3 text-right text-sm md:table-cell">{row.reach.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-success">
                        {row.engagementRate.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-ink-muted">{ENGAGEMENT_FORMULA}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
