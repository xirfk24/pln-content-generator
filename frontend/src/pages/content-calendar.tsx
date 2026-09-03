'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { CONTENT_STATUS_COLORS, CONTENT_STATUS_LABELS } from '@/constants'
import type { Content } from '@/types'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export default function CalendarPage() {
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

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
        const dateStr = content.planned_date
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Content Calendar</h1>
          <p className="mt-1 text-sm text-ink-secondary">Visual overview of scheduled content</p>
        </div>
        <Button variant="outline" onClick={goToToday} className="self-start sm:self-auto">Today</Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-lg">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-ink-muted" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[768px] grid-cols-7">
              {DAYS.map((day) => (
                <div key={day} className="truncate border-b bg-surface-muted p-2 text-center text-xs font-medium text-ink-secondary">
                  {day}
                </div>
              ))}
              
              {calendar.days.map((day, index) => {
                const dateStr = day.date.toISOString().split('T')[0]
                const dayContents = contentsByDate.get(dateStr) || []
                
                return (
                  <div
                    key={index}
                    className={`min-h-28 border-b border-r p-1 last:border-r-0 ${!day.isCurrentMonth ? 'bg-surface-muted' : 'bg-surface'} ${isToday(day.date) ? 'bg-primary-soft' : ''}`}
                  >
                    <div className={`mb-1 text-xs ${day.isCurrentMonth ? 'text-ink' : 'text-ink-muted'} ${isToday(day.date) ? 'font-bold text-primary' : ''}`}>
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayContents.slice(0, 3).map((content) => (
                        <div
                          key={content.id}
                          className={`group cursor-pointer truncate rounded px-1 py-0.5 text-xs ${CONTENT_STATUS_COLORS[content.status as keyof typeof CONTENT_STATUS_COLORS] || 'bg-surface-muted text-ink'}`}
                          title={`${content.title} - ${CONTENT_STATUS_LABELS[content.status as keyof typeof CONTENT_STATUS_LABELS] || content.status}`}
                        >
                          {content.title}
                        </div>
                      ))}
                      {dayContents.length > 3 && (
                        <div className="px-1 text-xs text-ink-secondary">
                          +{dayContents.length - 3} more
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
        <CardHeader>
          <CardTitle className="text-sm">Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CONTENT_STATUS_COLORS).map(([status, color]) => (
              <Badge key={status} className={color}>
                {CONTENT_STATUS_LABELS[status as keyof typeof CONTENT_STATUS_LABELS] || status}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
