'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from 'lucide-react'
import { CONTENT_STATUS_COLORS, CONTENT_STATUS_LABELS } from '@/constants'
import { PlatformCluster } from '@/components/ui/platform-icon'
import type { Content, Platform } from '@/types'
import Link from '@/compat/next'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export default function ContentCalendarPage() {
  const [contents, setContents] = useState<Content[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    apiFetch('/api/master-data')
      .then((res) => res.json())
      .then((d) => setPlatforms(d.platforms || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadContents()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate])

  async function loadContents() {
    setLoading(true)
    
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateFrom = new Date(year, month, 1).toISOString().split('T')[0]
    const dateTo = new Date(year, month + 1, 0).toISOString().split('T')[0]
    
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo })
      const res = await apiFetch(`/api/contents/calendar?${params.toString()}`)
      const data = await res.json()
      setContents(data.contents || [])
    } catch (error) {
      console.error('Failed to load calendar:', error)
    } finally {
      setLoading(false)
    }
  }

  const calendar = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days: { date: Date; isCurrentMonth: boolean }[] = []
    
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({ date, isCurrentMonth: false })
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }
    
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }

    return { days, weeks: Math.ceil(days.length / 7) }
  }, [currentDate])

  const contentsByDate = useMemo(() => {
    const map = new Map<string, Content[]>()
    contents.forEach((content) => {
      if (content.planned_date) {
        const dateStr = content.planned_date.split('T')[0]
        if (!map.has(dateStr)) map.set(dateStr, [])
        map.get(dateStr)!.push(content)
      }
    })
    return map
  }, [contents])

  function goToPrevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  function goToNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  const today = new Date()
  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold text-ink">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hari Ini
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={goToPrevMonth} title="Bulan Sebelumnya">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={goToNextMonth} title="Bulan Berikutnya">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
              <span className="ml-2 text-sm text-ink-secondary">Memuat jadwal kalender...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[768px] grid-cols-7 border-collapse">
                {DAYS.map((day) => (
                  <div key={day} className="border-b border-r bg-surface-muted p-2 text-center text-xs font-semibold uppercase tracking-wider text-ink-secondary last:border-r-0">
                    {day}
                  </div>
                ))}
                
                {calendar.days.map((day, index) => {
                  const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`
                  const dayContents = contentsByDate.get(dateStr) || []
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-28 border-b border-r p-1.5 transition-colors last:border-r-0 ${!day.isCurrentMonth ? 'bg-slate-50/50 text-ink-muted dark:bg-slate-900/30' : 'bg-surface text-ink'} ${isToday(day.date) ? 'bg-blue-50/60 ring-1 ring-inset ring-primary/30' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${isToday(day.date) ? 'bg-primary font-bold text-white' : day.isCurrentMonth ? 'font-medium' : 'text-ink-muted'}`}>
                          {day.date.getDate()}
                        </span>
                        {dayContents.length > 0 && (
                          <span className="text-[10px] text-ink-muted">
                            {dayContents.length} konten
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayContents.slice(0, 3).map((content) => {
                          const itemPlatforms = content.platform_ids && content.platform_ids.length > 0
                            ? content.platform_ids
                            : content.platform?.name ? [content.platform.name] : []
                          return (
                            <Link
                              key={content.id}
                              href={`/content/${content.id}`}
                              className={`block group rounded border px-1.5 py-1 text-[11px] font-medium transition hover:shadow-xs ${CONTENT_STATUS_COLORS[content.status as keyof typeof CONTENT_STATUS_COLORS] || 'bg-slate-100 text-slate-800'}`}
                              title={`[${content.pillar?.name || 'Pilar'}] ${content.title} - Topik: ${content.topic || '-'} (${CONTENT_STATUS_LABELS[content.status as keyof typeof CONTENT_STATUS_LABELS] || content.status})`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate flex-1 font-semibold">{content.title}</span>
                                {itemPlatforms.length > 0 && (
                                  <PlatformCluster platforms={itemPlatforms} masterPlatforms={platforms} maxDisplay={2} />
                                )}
                              </div>
                            </Link>
                          )
                        })}
                        {dayContents.length > 3 && (
                          <div className="px-1 text-[10px] font-medium text-ink-muted">
                            +{dayContents.length - 3} lainnya
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Keterangan Status Konten
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="flex flex-wrap gap-2">
            {['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'REVISION_REQUIRED'].map((status) => (
              <Badge key={status} variant="outline" className={`text-xs ${CONTENT_STATUS_COLORS[status as keyof typeof CONTENT_STATUS_COLORS]}`}>
                {CONTENT_STATUS_LABELS[status] || status}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
