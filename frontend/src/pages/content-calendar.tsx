'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar as CalendarIcon,
  Sparkles,
  BookmarkPlus,
  Info,
  Filter,
  Flag,
  Globe,
  Building2,
  Leaf,
  Briefcase,
  MoonStar,
  ExternalLink,
  Plus,
  Layers,
} from 'lucide-react'
import { CONTENT_STATUS_COLORS, CONTENT_STATUS_LABELS } from '@/constants'
import { PlatformCluster } from '@/components/ui/platform-icon'
import type { Content, Platform, PlanningPeriod, ImportantEvent } from '@/types'
import { Select } from '@/components/ui/select'
import Link, { useRouter } from '@/compat/next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const FULL_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

export const EVENT_CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: any; badgeClass: string; borderClass: string; dotColor: string }
> = {
  HUT_INSTANSI: {
    label: 'HUT Instansi & BUMN',
    icon: Building2,
    badgeClass:
      'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 hover:bg-amber-200',
    borderClass: 'border-l-4 border-l-amber-500',
    dotColor: 'bg-amber-500',
  },
  NASIONAL: {
    label: 'Hari Besar Nasional',
    icon: Flag,
    badgeClass:
      'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800 hover:bg-rose-200',
    borderClass: 'border-l-4 border-l-rose-500',
    dotColor: 'bg-rose-500',
  },
  INTERNASIONAL: {
    label: 'Hari Internasional',
    icon: Globe,
    badgeClass:
      'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800 hover:bg-sky-200',
    borderClass: 'border-l-4 border-l-sky-500',
    dotColor: 'bg-sky-500',
  },
  LINGKUNGAN: {
    label: 'Lingkungan & Energi',
    icon: Leaf,
    badgeClass:
      'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800 hover:bg-emerald-200',
    borderClass: 'border-l-4 border-l-emerald-500',
    dotColor: 'bg-emerald-500',
  },
  PROFESI: {
    label: 'Profesi, K3 & Pelayanan',
    icon: Briefcase,
    badgeClass:
      'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800 hover:bg-indigo-200',
    borderClass: 'border-l-4 border-l-indigo-500',
    dotColor: 'bg-indigo-500',
  },
  KESEHATAN: {
    label: 'Kesehatan Masyarakat',
    icon: Sparkles,
    badgeClass:
      'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-800 hover:bg-teal-200',
    borderClass: 'border-l-4 border-l-teal-500',
    dotColor: 'bg-teal-500',
  },
  KEAGAMAAN: {
    label: 'Hari Raya Keagamaan',
    icon: MoonStar,
    badgeClass:
      'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800 hover:bg-purple-200',
    borderClass: 'border-l-4 border-l-purple-500',
    dotColor: 'bg-purple-500',
  },
}

export default function ContentCalendarPage() {
  const router = useRouter()
  const [contents, setContents] = useState<Content[]>([])
  const [importantEvents, setImportantEvents] = useState<ImportantEvent[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [periods, setPeriods] = useState<PlanningPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Modal Detail Hari / Agenda Harian Lengkap
  const [selectedDayModal, setSelectedDayModal] = useState<{
    date: Date
    dateStr: string
    events: ImportantEvent[]
    contents: Content[]
  } | null>(null)

  useEffect(() => {
    Promise.all([
      apiFetch('/api/master-data').then((res) => (res.ok ? res.json() : { platforms: [] })),
      apiFetch('/api/planning-periods').then((res) => (res.ok ? res.json() : { periods: [] })),
    ])
      .then(([d, pData]: [any, any]) => {
        setPlatforms(d.platforms || [])
        setPeriods(pData.periods || [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate])

  async function loadData() {
    setLoading(true)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const dateFrom = new Date(year, month, 1).toISOString().split('T')[0]
    const dateTo = new Date(year, month + 1, 0).toISOString().split('T')[0]

    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo })
      const eventsParams = new URLSearchParams({
        month: String(month + 1),
        year: String(year),
      })

      const [contentsRes, eventsRes] = await Promise.all([
        apiFetch(`/api/contents/calendar?${params.toString()}`),
        apiFetch(`/api/important-events?${eventsParams.toString()}`),
      ])

      const [contentsData, eventsData] = await Promise.all([
        contentsRes.json(),
        eventsRes.ok ? eventsRes.json() : { events: [] },
      ])

      setContents(contentsData.contents || [])
      setImportantEvents(eventsData.events || [])
    } catch (error) {
      console.error('Failed to load calendar data:', error)
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

  // Map events by day of current month (1..31)
  const eventsByDay = useMemo(() => {
    const map = new Map<number, ImportantEvent[]>()
    importantEvents.forEach((ev) => {
      if (selectedCategory !== 'ALL' && ev.category !== selectedCategory) {
        return
      }
      if (!map.has(ev.day)) map.set(ev.day, [])
      map.get(ev.day)!.push(ev)
    })
    return map
  }, [importantEvents, selectedCategory])

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

  function handleCreateGreetingContent(event: ImportantEvent, dateStr: string) {
    setSelectedDayModal(null)
    const title = `Peringatan ${event.name}`
    const brief = `Peringatan ${event.name}. ${event.description || ''}`
    const query = new URLSearchParams({
      title,
      planned_date: dateStr,
      brief,
      topic: 'Z - Lain-Lain',
      posting_category: 'CAMPAIGN',
    })
    router.push(`/content/new?${query.toString()}`)
  }

  function handleCreateGeneralContent(dateStr: string) {
    setSelectedDayModal(null)
    router.push(`/content/new?planned_date=${dateStr}`)
  }

  return (
    <div className="space-y-4">
      {/* Header Kartu Kalender & Toolbar */}
      <Card className="shadow-xs">
        <CardHeader className="border-b py-3.5 px-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Judul Bulan & Navigator */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-ink flex items-center gap-2">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
                <p className="text-xs text-ink-muted">
                  Jadwal perencanaan konten & Kalender Hari Peringatan Resmi
                </p>
              </div>
            </div>

            {/* Filter & Kontrol */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Kategori Hari Peringatan */}
              <div className="flex items-center gap-1.5 bg-surface-muted/80 p-1 rounded-lg border border-border">
                <Filter className="h-3.5 w-3.5 ml-1.5 text-ink-muted" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-7 text-xs font-medium bg-transparent border-0 focus:ring-0 text-ink cursor-pointer pr-6"
                  aria-label="Filter Kategori Hari Peringatan"
                >
                  <option value="ALL">Semua Hari Peringatan</option>
                  <option value="HUT_INSTANSI">🏛️ HUT Instansi & BUMN</option>
                  <option value="NASIONAL">🇮🇩 Hari Besar Nasional</option>
                  <option value="INTERNASIONAL">🌍 Hari Internasional</option>
                  <option value="LINGKUNGAN">🌿 Lingkungan & Energi</option>
                  <option value="PROFESI">💼 Profesi, K3 & Pelayanan</option>
                  <option value="KESEHATAN">🏥 Kesehatan Masyarakat</option>
                  <option value="KEAGAMAAN">✨ Hari Raya Keagamaan</option>
                </select>
              </div>

              {/* Lompat ke Periode */}
              {periods.length > 0 && (
                <Select
                  value={selectedPeriodId}
                  onChange={(e) => {
                    const pId = e.target.value
                    setSelectedPeriodId(pId)
                    const p = periods.find((item) => item.id === pId)
                    if (p) {
                      const sDate = new Date(p.start_date)
                      if (!isNaN(sDate.getTime())) setCurrentDate(sDate)
                    }
                  }}
                  className="h-8 w-44 text-xs font-medium bg-white dark:bg-slate-900"
                  aria-label="Pilih Periode Perencanaan"
                >
                  <option value="">Lompat ke Periode...</option>
                  {periods.map((pp) => (
                    <option key={pp.id} value={pp.id}>
                      {pp.name} ({pp.status})
                    </option>
                  ))}
                </Select>
              )}

              {/* Navigasi Hari Ini & Bulan */}
              <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs font-medium">
                Hari Ini
              </Button>
              <div className="flex items-center gap-1 bg-surface-muted/60 p-0.5 rounded-lg border border-border">
                <Button variant="ghost" size="icon" onClick={goToPrevMonth} title="Bulan Sebelumnya" className="h-7 w-7">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={goToNextMonth} title="Bulan Berikutnya" className="h-7 w-7">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2.5 text-xs font-medium text-ink-secondary">
                Memuat kalender konten & hari peringatan...
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[840px] grid-cols-7 border-collapse">
                {/* Header Nama Hari */}
                {DAYS.map((day, idx) => (
                  <div
                    key={day}
                    className={`border-b border-r bg-surface-muted/90 p-2 text-center text-xs font-bold uppercase tracking-wider last:border-r-0 ${
                      idx === 0 || idx === 6 ? 'text-rose-600 dark:text-rose-400' : 'text-ink-secondary'
                    }`}
                  >
                    {day}
                  </div>
                ))}

                {/* Grid Tanggal */}
                {calendar.days.map((day, index) => {
                  const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`
                  const dayContents = contentsByDate.get(dateStr) || []
                  const dayEvents = day.isCurrentMonth ? eventsByDay.get(day.date.getDate()) || [] : []
                  const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6

                  // Total items & compact display logic
                  const maxPreviewItems = 3
                  const visibleEvents = dayEvents.slice(0, 1)
                  const remainingSlotsForContents = Math.max(0, maxPreviewItems - visibleEvents.length)
                  const visibleContents = dayContents.slice(0, remainingSlotsForContents)
                  
                  const hiddenCount = (dayEvents.length - visibleEvents.length) + (dayContents.length - visibleContents.length)

                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (day.isCurrentMonth && (dayEvents.length > 0 || dayContents.length > 0)) {
                          setSelectedDayModal({ date: day.date, dateStr, events: dayEvents, contents: dayContents })
                        }
                      }}
                      className={`h-36 max-h-36 overflow-hidden border-b border-r p-1.5 transition-all last:border-r-0 flex flex-col justify-between cursor-pointer group hover:bg-primary/5 ${
                        !day.isCurrentMonth
                          ? 'bg-slate-50/40 text-ink-muted dark:bg-slate-900/30 opacity-50 cursor-default hover:bg-transparent'
                          : isWeekend
                          ? 'bg-slate-50/30 dark:bg-slate-900/10'
                          : 'bg-surface text-ink'
                      } ${isToday(day.date) ? 'bg-blue-50/70 dark:bg-blue-950/20 ring-2 ring-inset ring-primary/40' : ''}`}
                    >
                      <div className="overflow-hidden flex-1 flex flex-col">
                        {/* Header Kotak Tanggal */}
                        <div className="flex items-center justify-between mb-1 shrink-0">
                          <span
                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                              isToday(day.date)
                                ? 'bg-primary font-bold text-white shadow-xs'
                                : day.isCurrentMonth
                                ? isWeekend
                                  ? 'font-bold text-rose-600 dark:text-rose-400'
                                  : 'font-semibold text-ink'
                                : 'text-ink-muted'
                            }`}
                          >
                            {day.date.getDate()}
                          </span>

                          <div className="flex items-center gap-1">
                            {dayEvents.length > 0 && (
                              <span
                                className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                title={`${dayEvents.length} Hari Peringatan`}
                              >
                                {dayEvents.length} event
                              </span>
                            )}
                            {dayContents.length > 0 && (
                              <span className="text-[9px] font-medium text-ink-muted bg-surface-muted px-1 py-0.2 rounded border border-border">
                                {dayContents.length} pos
                              </span>
                            )}
                          </div>
                        </div>

                        {/* List Preview Ringkas */}
                        <div className="space-y-1 overflow-hidden flex-1">
                          {/* 1. Preview Hari Peringatan Teratas */}
                          {visibleEvents.map((ev) => {
                            const conf = EVENT_CATEGORY_CONFIG[ev.category] || EVENT_CATEGORY_CONFIG.NASIONAL
                            const IconComponent = conf.icon
                            return (
                              <div
                                key={ev.id}
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 border truncate shadow-2xs ${conf.badgeClass}`}
                                title={`[${conf.label}] ${ev.name} - Klik untuk agenda lengkap`}
                              >
                                <IconComponent className="h-2.5 w-2.5 shrink-0 opacity-85" />
                                <span className="truncate">{ev.name}</span>
                              </div>
                            )
                          })}

                          {/* 2. Preview Konten Terencana */}
                          {visibleContents.map((content) => {
                            const itemPlatforms =
                              content.platform_ids && content.platform_ids.length > 0
                                ? content.platform_ids
                                : content.platform?.name
                                ? [content.platform.name]
                                : []
                            return (
                              <div
                                key={content.id}
                                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium transition ${
                                  CONTENT_STATUS_COLORS[content.status as keyof typeof CONTENT_STATUS_COLORS] ||
                                  'bg-slate-100 text-slate-800'
                                }`}
                                title={`[${content.pillar?.name || 'Pilar'}] ${content.title} (${CONTENT_STATUS_LABELS[content.status as keyof typeof CONTENT_STATUS_LABELS] || content.status})`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate flex-1 font-semibold">{content.title}</span>
                                  {itemPlatforms.length > 0 && (
                                    <PlatformCluster
                                      platforms={itemPlatforms}
                                      masterPlatforms={platforms}
                                      maxDisplay={1}
                                    />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Tombol Expand / +N Lainnya */}
                      {hiddenCount > 0 && (
                        <div className="mt-1 shrink-0">
                          <span className="w-full inline-flex items-center justify-center py-0.5 text-[9px] font-bold text-primary bg-primary/10 rounded border border-primary/20 hover:bg-primary/20 transition">
                            +{hiddenCount} agenda lainnya...
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Baris Keterangan / Legenda */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Legenda 1: Hari Peringatan & Event Resmi */}
        <Card className="shadow-2xs">
          <CardHeader className="py-2.5 px-4 border-b">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5 text-primary" />
              Kategori Hari Peringatan & Calendar of Events
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(EVENT_CATEGORY_CONFIG).map(([key, conf]) => {
                const IconComponent = conf.icon
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === key ? 'ALL' : key)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition ${
                      selectedCategory === key
                        ? 'ring-2 ring-primary ring-offset-1 font-bold shadow-xs ' + conf.badgeClass
                        : conf.badgeClass
                    }`}
                  >
                    <IconComponent className="h-3 w-3" />
                    {conf.label}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legenda 2: Status Alur Konten */}
        <Card className="shadow-2xs">
          <CardHeader className="py-2.5 px-4 border-b">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-ink-muted" />
              Keterangan Status Alur Konten
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap gap-1.5">
              {[
                'DRAFT',
                'PENDING_REVIEW',
                'APPROVED',
                'PRODUCTION',
                'PENDING_PRODUCTION_REVIEW',
                'READY_TO_PUBLISH',
                'PUBLISHED',
                'REJECTED',
              ].map((status) => (
                <Badge
                  key={status}
                  variant="outline"
                  className={`text-[11px] py-0.5 px-2 ${
                    CONTENT_STATUS_COLORS[status as keyof typeof CONTENT_STATUS_COLORS]
                  }`}
                >
                  {CONTENT_STATUS_LABELS[status] || status}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* MODAL AGENDA HARIAN LENGKAP (DAY VIEW DIALOG)                              */}
      {/* ========================================================================= */}
      <Dialog
        open={!!selectedDayModal}
        onOpenChange={(open) => !open && setSelectedDayModal(null)}
      >
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {selectedDayModal && (
            <div className="flex flex-col h-full">
              {/* Header Modal */}
              <DialogHeader className="p-4 border-b border-border bg-surface-muted/50 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    <div>
                      <DialogTitle className="text-base font-bold text-ink">
                        Agenda {FULL_DAYS[selectedDayModal.date.getDay()]},{' '}
                        {selectedDayModal.date.getDate()} {MONTHS[selectedDayModal.date.getMonth()]}{' '}
                        {selectedDayModal.date.getFullYear()}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-ink-muted mt-0.5">
                        {selectedDayModal.events.length} Hari Peringatan &bull;{' '}
                        {selectedDayModal.contents.length} Konten Terencana
                      </DialogDescription>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleCreateGeneralContent(selectedDayModal.dateStr)}
                    className="h-8 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white shadow-xs"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Buat Konten Baru
                  </Button>
                </div>
              </DialogHeader>

              {/* Isi Konten Agenda Harian (Scrollable) */}
              <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
                {/* 1. SEKSI HARI PERINGATAN */}
                {selectedDayModal.events.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                      <Flag className="h-3.5 w-3.5 text-primary" />
                      Hari Peringatan Resmi & Calendar of Events ({selectedDayModal.events.length})
                    </h4>
                    <div className="space-y-2.5">
                      {selectedDayModal.events.map((ev) => {
                        const conf =
                          EVENT_CATEGORY_CONFIG[ev.category] || EVENT_CATEGORY_CONFIG.NASIONAL
                        const IconComponent = conf.icon
                        return (
                          <div
                            key={ev.id}
                            className={`p-3 rounded-xl border bg-surface space-y-2 shadow-xs ${conf.borderClass}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-bold py-0.5 px-2 ${conf.badgeClass}`}
                                  >
                                    <IconComponent className="mr-1 h-3 w-3" />
                                    {conf.label}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] font-medium py-0.5 px-2 text-ink-muted"
                                  >
                                    {ev.status}
                                  </Badge>
                                </div>
                                <h5 className="text-sm font-bold text-ink leading-snug">
                                  {ev.name}
                                </h5>
                              </div>
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleCreateGreetingContent(ev, selectedDayModal.dateStr)
                                }
                                className="h-8 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white shadow-xs shrink-0"
                              >
                                <BookmarkPlus className="mr-1.5 h-3.5 w-3.5" />
                                Buat Ucapan
                              </Button>
                            </div>
                            {ev.description && (
                              <p className="text-xs text-ink-secondary leading-relaxed bg-surface-muted/60 p-2.5 rounded-lg border border-border/80">
                                {ev.description}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 2. SEKSI KONTEN TERENCANA */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-ink-muted" />
                    Daftar Konten Terencana ({selectedDayModal.contents.length})
                  </h4>

                  {selectedDayModal.contents.length === 0 ? (
                    <div className="p-6 text-center rounded-xl border border-dashed border-border bg-surface-muted/40 text-ink-muted">
                      <p className="text-xs">Belum ada konten yang dijadwalkan pada tanggal ini.</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleCreateGeneralContent(selectedDayModal.dateStr)}
                        className="text-xs text-primary mt-1"
                      >
                        + Tambahkan rencana konten untuk tanggal ini
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayModal.contents.map((content) => {
                        const itemPlatforms =
                          content.platform_ids && content.platform_ids.length > 0
                            ? content.platform_ids
                            : content.platform?.name
                            ? [content.platform.name]
                            : []
                        return (
                          <div
                            key={content.id}
                            className="p-3 rounded-xl border border-border bg-surface hover:bg-surface-muted/50 transition flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-bold ${
                                    CONTENT_STATUS_COLORS[
                                      content.status as keyof typeof CONTENT_STATUS_COLORS
                                    ] || 'bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  {CONTENT_STATUS_LABELS[content.status] || content.status}
                                </Badge>
                                {content.pillar?.name && (
                                  <span className="text-[11px] text-ink-muted font-medium">
                                    Pilar: {content.pillar.name}
                                  </span>
                                )}
                                {content.topic && (
                                  <span className="text-[11px] text-ink-secondary font-medium">
                                    &bull; Topik: {content.topic}
                                  </span>
                                )}
                              </div>
                              <h5 className="text-xs font-bold text-ink truncate">
                                {content.title}
                              </h5>
                              <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                                <span>Format: {content.format || '-'}</span>
                                {itemPlatforms.length > 0 && (
                                  <div className="flex items-center gap-1 ml-2">
                                    <span>Platform:</span>
                                    <PlatformCluster
                                      platforms={itemPlatforms}
                                      masterPlatforms={platforms}
                                      maxDisplay={3}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            <Link
                              href={`/content/${content.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0 p-2 rounded-lg hover:bg-primary/10"
                            >
                              Detail
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Modal */}
              <DialogFooter className="p-3 border-t border-border bg-surface-muted/30 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDayModal(null)}
                  className="text-xs h-8 rounded-lg"
                >
                  Tutup
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
