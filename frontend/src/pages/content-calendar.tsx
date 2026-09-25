'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar as CalendarIcon,
  BookmarkPlus,
  Filter,
  Flag,
  Plus,
  Clock,
  CalendarDays,
} from 'lucide-react'
import type { ImportantEvent } from '@/types'
import { useRouter } from '@/compat/next'
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

// ============================================================================
// DEFINISI KONTEN & JADWAL RUTIN BULANAN PLN (WARNA BIRU KHAS PLN)
// ============================================================================
export interface PLNMonthlyRoutine {
  id: string
  name: string
  dayStart: number
  dayEnd: number
  isExactDay?: boolean
  category: 'PLN_ROUTINE'
  tag: string
  badgeClass: string
  borderClass: string
  description: string
  contentBrief: string
  topic: string
}

export const PLN_MONTHLY_ROUTINES: PLNMonthlyRoutine[] = [
  {
    id: 'pln-tagihan-terbit',
    name: 'Tagihan Listrik Muncul di PLN Mobile',
    dayStart: 3,
    dayEnd: 3,
    isExactDay: true,
    category: 'PLN_ROUTINE',
    tag: 'Tgl 3',
    badgeClass:
      'bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-700 font-semibold',
    borderClass: 'border-l-4 border-l-[#0072B2]',
    description:
      'Tagihan listrik pascabayar untuk periode pemakaian bulan sebelumnya mulai muncul dan siap dicek pelanggan di aplikasi PLN Mobile.',
    contentBrief:
      'Publikasikan informasi bahwa tagihan listrik pascabayar per tanggal 3 sudah dapat dicek melalui aplikasi PLN Mobile. Ajak pelanggan mengecek rincian tagihan secara mandiri.',
    topic: 'Informasi Layanan & Tagihan Listrik',
  },
  {
    id: 'pln-periode-aman-bayar',
    name: 'Periode Aman Bayar Tagihan Listrik',
    dayStart: 3,
    dayEnd: 19,
    category: 'PLN_ROUTINE',
    tag: 'Tgl 3–19',
    badgeClass:
      'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800 font-semibold',
    borderClass: 'border-l-4 border-l-[#0072B2]',
    description:
      'Masa pembayaran tagihan listrik pascabayar yang aman dan tepat waktu (tanggal 3 s.d 19) sebelum jatuh tempo tanggal 20 agar aliran listrik tetap nyaman tanpa denda.',
    contentBrief:
      'Edukasi pelanggan tentang periode aman pembayaran tagihan listrik (tgl 3–19) sebelum jatuh tempo. Informasikan kemudahan pembayaran via PLN Mobile, Virtual Account, dan mitra resmi PLN.',
    topic: 'Pembayaran Tepat Waktu & Kemudahan Transaksi',
  },
  {
    id: 'pln-batas-akhir-bayar',
    name: 'Batas Akhir Pembayaran Tagihan Listrik',
    dayStart: 20,
    dayEnd: 20,
    isExactDay: true,
    category: 'PLN_ROUTINE',
    tag: 'Jatuh Tempo (Tgl 20)',
    badgeClass:
      'bg-sky-200 text-sky-950 border-sky-400 dark:bg-sky-900/90 dark:text-sky-100 dark:border-sky-600 font-bold',
    borderClass: 'border-l-4 border-l-[#0072B2]',
    description:
      'Batas akhir (jatuh tempo) pembayaran tagihan listrik pascabayar setiap bulannya. Pembayaran setelah tanggal 20 berisiko terkena denda keterlambatan dan sanksi pemutusan sementara.',
    contentBrief:
      'Pengingat penting (Due Date Reminder) bahwa hari ini tanggal 20 adalah batas akhir pembayaran tagihan listrik pascabayar. Himbau pelanggan segera melunasi sebelum pukul 23:59 WIB.',
    topic: 'Peringatan Jatuh Tempo Pembayaran',
  },
  {
    id: 'pln-catat-meter-mandiri',
    name: 'Periode Catat Meter Mandiri (SwaCAM)',
    dayStart: 23,
    dayEnd: 27,
    category: 'PLN_ROUTINE',
    tag: 'Tgl 23–27',
    badgeClass:
      'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800 font-semibold',
    borderClass: 'border-l-4 border-l-[#0072B2]',
    description:
      'Periode pelanggan pascabayar melakukan pencatatan angka kWh meter mandiri (SwaCAM) melalui aplikasi PLN Mobile (tanggal 23 s.d 27) untuk kepastian tagihan listrik yang akurat.',
    contentBrief:
      'Kampanye fitur Catat Meter Mandiri (SwaCAM) di aplikasi PLN Mobile periode 23-27 setiap bulan. Berikan panduan cara foto angka stand meter dengan jelas serta manfaat tagihan yang sesuai pemakaian riil.',
    topic: 'Fitur SwaCAM / Catat Meter Mandiri PLN Mobile',
  },
]

// Unified interface untuk agenda hari
export interface DayAgendaItem {
  id: string
  name: string
  category: string
  type: 'PLN' | 'LIBUR_NASIONAL' | 'NASIONAL' | 'INTERNASIONAL'
  tag?: string
  status?: string
  isPublicHoliday?: boolean
  description?: string
  contentBrief?: string
  topic?: string
  isSpanStart?: boolean
  isSpanActive?: boolean
  badgeClass: string
  borderClass: string
  categoryLabel: string
}

// Daftar Hari Libur Nasional Tetap Indonesia (Bulan, Hari, Nama)
const FIXED_PUBLIC_HOLIDAYS = [
  { month: 1, day: 1, name: 'Tahun Baru Masehi' },
  { month: 5, day: 1, name: 'Hari Buruh Internasional (May Day)' },
  { month: 6, day: 1, name: 'Hari Lahir Pancasila' },
  { month: 8, day: 17, name: 'HUT Proklamasi Kemerdekaan RI' },
  { month: 12, day: 25, name: 'Hari Raya Natal' },
]

export type CalendarFilterType = 'ALL' | 'PLN' | 'NASIONAL'

export default function ContentCalendarPage() {
  const router = useRouter()
  const [importantEvents, setImportantEvents] = useState<ImportantEvent[]>([])
  const [calendarFilter, setCalendarFilter] = useState<CalendarFilterType>('ALL')
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month')
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Status collapse kartu "Jadwal Konten Rutin Bulanan PLN". Default to true (collapsed) per spec.
  const [isRoutineCollapsed, setIsRoutineCollapsed] = useState(true)

  useEffect(() => {
    const saved = window.localStorage.getItem('pln-routine-card-collapsed')
    if (saved === 'false') setIsRoutineCollapsed(false)
    else setIsRoutineCollapsed(true)
  }, [])

  function toggleRoutineCollapsed() {
    setIsRoutineCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem('pln-routine-card-collapsed', String(next))
      return next
    })
  }

  // Modal Detail Hari / Agenda Harian Lengkap
  const [selectedDayModal, setSelectedDayModal] = useState<{
    date: Date
    dateStr: string
    isHoliday: boolean
    items: DayAgendaItem[]
  } | null>(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate])

  async function loadData() {
    setLoading(true)
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    try {
      const eventsParams = new URLSearchParams({
        month: String(month + 1),
        year: String(year),
      })

      const eventsRes = await apiFetch(`/api/important-events?${eventsParams.toString()}`)
      const eventsData = eventsRes.ok ? await eventsRes.json() : { events: [] }

      setImportantEvents(eventsData.events || [])
    } catch (error) {
      console.error('Failed to load calendar events:', error)
    } finally {
      setLoading(false)
    }
  }

  // Grid Kalender 42 cell
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

  // Hitung agenda dengan diferensiasi warna yang tegas untuk setiap hari (1..31)
  const agendasByDay = useMemo(() => {
    const map = new Map<number, DayAgendaItem[]>()
    const month = currentDate.getMonth() + 1

    for (let d = 1; d <= 31; d++) {
      map.set(d, [])
    }

    if (calendarFilter === 'ALL' || calendarFilter === 'NASIONAL') {
      FIXED_PUBLIC_HOLIDAYS.forEach((fh) => {
        if (fh.month === month) {
          map.get(fh.day)?.push({
            id: `fixed-holiday-${fh.month}-${fh.day}`,
            name: fh.name,
            category: 'NASIONAL',
            type: 'LIBUR_NASIONAL',
            categoryLabel: 'Hari Libur Nasional',
            tag: 'Libur Nasional',
            isPublicHoliday: true,
            description: `Hari Libur Nasional resmi: ${fh.name}`,
            contentBrief: `Publikasikan konten ucapan & informasi Hari Libur Nasional: ${fh.name}`,
            topic: 'Hari Libur Nasional & Peringatan Resmi',
            badgeClass:
              'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700 font-bold',
            borderClass: 'border-l-4 border-l-rose-600',
          })
        }
      })
    }

    if (calendarFilter === 'ALL' || calendarFilter === 'PLN') {
      PLN_MONTHLY_ROUTINES.forEach((routine) => {
        for (let d = routine.dayStart; d <= routine.dayEnd; d++) {
          const isStart = d === routine.dayStart
          map.get(d)?.push({
            id: `${routine.id}-${d}`,
            name: routine.name,
            category: 'PLN_ROUTINE',
            type: 'PLN',
            categoryLabel: 'Kalender PLN',
            tag: routine.tag,
            description: routine.description,
            contentBrief: routine.contentBrief,
            topic: routine.topic,
            isSpanStart: isStart,
            isSpanActive: true,
            badgeClass: routine.badgeClass,
            borderClass: routine.borderClass,
          })
        }
      })
    }

    importantEvents.forEach((ev) => {
      const isPublicHoliday = ev.status === 'LIBUR_NASIONAL'
      const isPLNEvent =
        ev.name.toLowerCase().includes('pln') ||
        ev.name.toLowerCase().includes('listrik') ||
        (ev.category === 'HUT_INSTANSI' && ev.name.toLowerCase().includes('pln'))

      if (calendarFilter === 'PLN' && !isPLNEvent) return
      if (calendarFilter === 'NASIONAL' && isPLNEvent) return

      const existingList = map.get(ev.day) || []
      const duplicateIndex = existingList.findIndex(
        (it) => it.name.toLowerCase() === ev.name.toLowerCase()
      )

      if (duplicateIndex >= 0) {
        existingList[duplicateIndex].description = ev.description || existingList[duplicateIndex].description
        return
      }

      let itemType: 'PLN' | 'LIBUR_NASIONAL' | 'NASIONAL' | 'INTERNASIONAL' = 'NASIONAL'
      let badgeClass = ''
      let borderClass = ''
      let categoryLabel = 'Hari Besar Nasional'

      if (isPLNEvent) {
        itemType = 'PLN'
        categoryLabel = 'Kalender PLN'
        badgeClass =
          'bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-700 font-semibold'
        borderClass = 'border-l-4 border-l-[#0072B2]'
      } else if (isPublicHoliday) {
        itemType = 'LIBUR_NASIONAL'
        categoryLabel = 'Hari Libur Nasional'
        badgeClass =
          'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700 font-bold'
        borderClass = 'border-l-4 border-l-rose-600'
      } else if (ev.category === 'INTERNASIONAL' || ev.category === 'LINGKUNGAN') {
        itemType = 'INTERNASIONAL'
        categoryLabel = ev.category === 'LINGKUNGAN' ? 'Lingkungan & Energi' : 'Hari Internasional'
        badgeClass =
          'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700 font-medium'
        borderClass = 'border-l-4 border-l-emerald-600'
      } else {
        itemType = 'NASIONAL'
        categoryLabel = 'Hari Besar Nasional'
        badgeClass =
          'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 font-medium'
        borderClass = 'border-l-4 border-l-amber-500'
      }

      map.get(ev.day)?.push({
        id: ev.id,
        name: ev.name,
        category: ev.category,
        type: itemType,
        categoryLabel,
        tag: ev.status,
        isPublicHoliday,
        description: ev.description || undefined,
        contentBrief: `Publikasikan konten peringatan resmi untuk ${ev.name}. ${ev.description || ''}`,
        topic: isPublicHoliday ? 'Hari Libur Nasional & Peringatan Resmi' : 'Z - Lain-Lain',
        badgeClass,
        borderClass,
      })
    })

    return map
  }, [importantEvents, calendarFilter, currentDate])

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
  const isToday = (date: Date) => date.toDateString() === today.toDateString()

  function handleCreateContentForAgenda(item: DayAgendaItem, dateStr: string) {
    setSelectedDayModal(null)
    const title = item.type === 'PLN' ? `Konten Rutin: ${item.name}` : `Peringatan ${item.name}`
    const brief = item.contentBrief || item.description || ''
    const topic = item.topic || 'Z - Lain-Lain'

    const query = new URLSearchParams({
      title,
      planned_date: dateStr,
      brief,
      topic,
      posting_category: 'UID',
    })
    router.push(`/content/planning/new?${query.toString()}`)
  }

  function handleCreateGeneralContent(dateStr: string) {
    setSelectedDayModal(null)
    router.push(`/content/planning/new?planned_date=${dateStr}`)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2 overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. KARTU JADWAL KONTEN RUTIN BULANAN PLN (COMPACT & COLLAPSIBLE)          */}
      {/* ========================================================================= */}
      {calendarFilter !== 'NASIONAL' && (
        <Card className="shrink-0 border-sky-200/80 bg-gradient-to-r from-sky-50/70 via-white to-sky-50/40 shadow-2xs dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30">
          <CardHeader
            className="py-1.5 px-3 cursor-pointer select-none"
            onClick={toggleRoutineCollapsed}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0072B2] text-white shadow-2xs">
                  <CalendarDays className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex items-center gap-2">
                  <CardTitle className="text-xs font-bold text-[#0072B2] dark:text-sky-300 truncate">
                    Jadwal Konten Rutin Bulanan PLN
                  </CardTitle>
                  <span className="hidden md:inline text-[11px] text-ink-muted truncate">
                    {isRoutineCollapsed
                      ? '· Siklus agenda tetap setiap bulan (Klik untuk tampilkan)'
                      : '· Siklus agenda tetap setiap bulan untuk edukasi dan pelayanan pelanggan'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold bg-white/90 border-[#0072B2]/30 text-[#0072B2] py-0 px-2"
                >
                  Berlaku Setiap Bulan
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleRoutineCollapsed()
                  }}
                  title={isRoutineCollapsed ? 'Tampilkan detail agenda rutin' : 'Sembunyikan agenda rutin'}
                  className="h-6 w-6 text-[#0072B2] hover:bg-[#0072B2]/10"
                >
                  {isRoutineCollapsed ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          {!isRoutineCollapsed && (
            <CardContent className="pt-0 pb-2 px-3 border-t border-sky-100/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
                {PLN_MONTHLY_ROUTINES.map((routine) => (
                  <div
                    key={routine.id}
                    className={`p-2 rounded-lg border bg-white dark:bg-slate-900/90 shadow-2xs space-y-1 ${routine.borderClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-50 text-sky-900 border border-sky-200">
                        <Clock className="h-2.5 w-2.5 text-[#0072B2]" />
                        {routine.tag}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-ink truncate">{routine.name}</h4>
                    <p className="text-[11px] text-ink-muted leading-tight line-clamp-1">
                      {routine.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 2. CALENDAR TOOLBAR & FULL MONTH VIEW                                      */}
      {/* ========================================================================= */}
      <Card className="shadow-xs flex-1 min-h-0 flex flex-col overflow-hidden border">
        {/* Header Toolbar Satu Baris */}
        <CardHeader className="border-b py-2 px-3 shrink-0 bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Navigasi Bulan & Hari Ini */}
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <div className="flex items-center gap-1 bg-surface-muted p-0.5 rounded-lg border border-border">
                <Button variant="ghost" size="icon" onClick={goToPrevMonth} title="Bulan Sebelumnya" className="h-6 w-6">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={goToNextMonth} title="Bulan Berikutnya" className="h-6 w-6">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={goToToday} className="h-7 text-xs font-semibold px-2.5">
                Hari Ini
              </Button>
            </div>

            {/* Filter & View Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Dropdown Filter */}
              <div className="flex items-center gap-1.5 bg-surface-muted px-2.5 py-0.5 rounded-lg border border-border">
                <Filter className="h-3 w-3 text-primary shrink-0" />
                <span className="text-[11px] font-semibold text-ink-muted hidden sm:inline">Filter:</span>
                <select
                  value={calendarFilter}
                  onChange={(e) => setCalendarFilter(e.target.value as CalendarFilterType)}
                  className="h-6 text-xs font-bold text-ink bg-transparent border-0 focus:ring-0 cursor-pointer pr-3 py-0"
                  aria-label="Pilih Kategori Kalender"
                >
                  <option value="ALL">Kalender Keseluruhan</option>
                  <option value="PLN">Kalender PLN</option>
                  <option value="NASIONAL">Kalender Nasional</option>
                </select>
              </div>

              {/* View Switcher: Bulan | Minggu | Hari */}
              <div className="inline-flex rounded-lg bg-surface-muted p-0.5 border border-border">
                <button
                  type="button"
                  onClick={() => setCalendarView('month')}
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all ${
                    calendarView === 'month'
                      ? 'bg-primary text-white shadow-2xs font-bold'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  Bulan
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarView('week')}
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all ${
                    calendarView === 'week'
                      ? 'bg-primary text-white shadow-2xs font-bold'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  Minggu
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarView('day')}
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all ${
                    calendarView === 'day'
                      ? 'bg-primary text-white shadow-2xs font-bold'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  Hari
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Grid Kalender */}
        <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="ml-2 text-xs font-medium text-ink-secondary">
                Memuat data kalender...
              </span>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header Nama Hari */}
              <div className="grid grid-cols-7 border-collapse shrink-0 bg-surface-muted/90 border-b">
                {DAYS.map((day, idx) => (
                  <div
                    key={day}
                    className={`py-1 text-center text-[11px] font-bold uppercase tracking-wider ${
                      idx === 0
                        ? 'text-rose-600 bg-rose-50/40 dark:bg-rose-950/20'
                        : idx === 6
                        ? 'text-rose-600/80'
                        : 'text-ink-secondary'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid 5/6 Minggu */}
              <div
                className="grid grid-cols-7 border-collapse flex-1 min-h-0"
                style={{ gridTemplateRows: `repeat(${calendar.weeks}, minmax(0, 1fr))` }}
              >
                {calendar.days.map((day, index) => {
                  const dayNum = day.date.getDate()
                  const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                  const dayAgendas = day.isCurrentMonth ? agendasByDay.get(dayNum) || [] : []
                  const isSunday = day.date.getDay() === 0
                  const isSaturday = day.date.getDay() === 6
                  const isPublicHoliday = day.isCurrentMonth && dayAgendas.some((a) => a.isPublicHoliday)
                  const isPLNPayDay = day.isCurrentMonth && dayNum === 20

                  const maxPreview = 1
                  const visibleAgendas = dayAgendas.slice(0, maxPreview)
                  const hiddenCount = dayAgendas.length - visibleAgendas.length

                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (day.isCurrentMonth && dayAgendas.length > 0) {
                          setSelectedDayModal({
                            date: day.date,
                            dateStr,
                            isHoliday: isPublicHoliday,
                            items: dayAgendas,
                          })
                        }
                      }}
                      className={`h-full overflow-hidden border-b border-r p-1 transition-all flex flex-col justify-between group ${
                        !day.isCurrentMonth
                          ? 'bg-slate-50/40 text-ink-muted dark:bg-slate-900/30 opacity-40 cursor-default'
                          : dayAgendas.length > 0
                          ? 'cursor-pointer hover:bg-sky-50/40 dark:hover:bg-sky-950/20'
                          : 'cursor-default'
                      } ${
                        isToday(day.date)
                          ? 'bg-blue-50/70 dark:bg-blue-950/20 ring-2 ring-inset ring-primary/50'
                          : isPublicHoliday
                          ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-900/50'
                          : isPLNPayDay && (calendarFilter === 'ALL' || calendarFilter === 'PLN')
                          ? 'bg-sky-50/50 dark:bg-sky-950/20'
                          : isSunday
                          ? 'bg-rose-50/25 dark:bg-rose-950/10'
                          : isSaturday
                          ? 'bg-slate-50/30 dark:bg-slate-900/10'
                          : 'bg-surface'
                      }`}
                    >
                      <div className="overflow-hidden flex-1 flex flex-col min-h-0">
                        {/* Header Kotak Tanggal */}
                        <div className="flex items-center justify-between mb-0.5 shrink-0">
                          <span
                            className={`inline-flex h-4.5 w-4.5 items-center justify-center rounded-full text-[11px] ${
                              isToday(day.date)
                                ? 'bg-primary font-bold text-white shadow-2xs'
                                : isPublicHoliday
                                ? 'bg-rose-600 font-bold text-white shadow-2xs'
                                : isSunday
                                ? 'font-bold text-rose-600'
                                : isSaturday
                                ? 'font-semibold text-rose-500/80'
                                : day.isCurrentMonth
                                ? 'font-semibold text-ink'
                                : 'text-ink-muted'
                            }`}
                          >
                            {dayNum}
                          </span>

                          <div className="flex items-center gap-1">
                            {isPublicHoliday && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-extrabold bg-rose-600 text-white"
                                title="Hari Libur Nasional (Tanggal Merah)"
                              >
                                <Flag className="h-2 w-2" />
                                Libur
                              </span>
                            )}
                            {day.isCurrentMonth && dayAgendas.length > 0 && !isPublicHoliday && (
                              <span className="text-[9px] font-semibold text-ink-muted">
                                {dayAgendas.length} agenda
                              </span>
                            )}
                          </div>
                        </div>

                        {/* List Preview Agenda */}
                        <div className="space-y-0.5 overflow-hidden flex-1 min-h-0">
                          {visibleAgendas.map((item) => (
                            <div
                              key={item.id}
                              className={`rounded px-1.5 py-0.2 text-[10px] truncate transition flex items-center gap-1.5 ${item.badgeClass}`}
                              title={`[${item.categoryLabel}] ${item.name}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                  item.type === 'PLN'
                                    ? 'bg-[#0072B2]'
                                    : item.type === 'LIBUR_NASIONAL'
                                    ? 'bg-rose-600'
                                    : item.type === 'INTERNASIONAL'
                                    ? 'bg-emerald-500'
                                    : 'bg-amber-500'
                                }`}
                              />
                              <span className="truncate">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Badge "+N lainnya" */}
                      {hiddenCount > 0 && (
                        <div className="mt-0.5 shrink-0">
                          <span className="w-full inline-flex items-center justify-center py-0.2 text-[9px] font-semibold text-primary bg-primary/10 rounded border border-primary/20 hover:bg-primary/20 transition">
                            +{hiddenCount} agenda lainnya
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

      {/* ========================================================================= */}
      {/* 4. MODAL AGENDA HARIAN LENGKAP (DAY VIEW DIALOG)                           */}
      {/* ========================================================================= */}
      <Dialog
        open={!!selectedDayModal}
        onOpenChange={(open) => !open && setSelectedDayModal(null)}
      >
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {selectedDayModal && (
            <div className="flex flex-col h-full">
              {/* Header Modal */}
              <DialogHeader
                className={`p-4 border-b shrink-0 ${
                  selectedDayModal.isHoliday
                    ? 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900'
                    : 'bg-surface-muted/50 border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon
                      className={`h-5 w-5 ${
                        selectedDayModal.isHoliday ? 'text-rose-600 dark:text-rose-400' : 'text-primary'
                      }`}
                    />
                    <div>
                      <DialogTitle className="text-base font-bold text-ink flex items-center gap-2">
                        <span>
                          Agenda {FULL_DAYS[selectedDayModal.date.getDay()]},{' '}
                          {selectedDayModal.date.getDate()}{' '}
                          {MONTHS[selectedDayModal.date.getMonth()]}{' '}
                          {selectedDayModal.date.getFullYear()}
                        </span>
                        {selectedDayModal.isHoliday && (
                          <Badge className="bg-rose-600 text-white text-[10px] font-bold">
                            Libur Nasional
                          </Badge>
                        )}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-ink-muted mt-0.5">
                        {selectedDayModal.items.length} Agenda & Hari Peringatan Terdaftar
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
              <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
                {selectedDayModal.items.map((item) => {
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border bg-surface space-y-2.5 shadow-xs ${item.borderClass}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold py-0.5 px-2 ${item.badgeClass}`}
                            >
                              {item.categoryLabel}
                            </Badge>
                            {item.tag && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-medium py-0.5 px-2 text-ink-muted"
                              >
                                {item.tag}
                              </Badge>
                            )}
                          </div>
                          <h5 className="text-sm font-bold text-ink leading-snug">
                            {item.name}
                          </h5>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCreateContentForAgenda(item, selectedDayModal.dateStr)}
                          className="h-8 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white shadow-xs shrink-0"
                        >
                          <BookmarkPlus className="mr-1.5 h-3.5 w-3.5" />
                          Buat Rencana Konten
                        </Button>
                      </div>

                      {item.description && (
                        <p className="text-xs text-ink-secondary leading-relaxed bg-surface-muted/60 p-2.5 rounded-lg border border-border/80">
                          {item.description}
                        </p>
                      )}
                    </div>
                  )
                })}
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
