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
  X,
  Check,
  FileText,
  Sparkles,
} from 'lucide-react'
import type { ImportantEvent } from '@/types'
import { useRouter } from '@/compat/next'
import { StatusBadge } from '@/components/ui/status-badge'
import { PlatformBadge, PlatformIconOnly } from '@/components/ui/platform-icon'

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
// DEFINISI KONTEN & JADWAL RUTIN BULANAN PLN
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

export interface DayAgendaItem {
  id: string
  name: string
  category: string
  type: 'PLN' | 'LIBUR_NASIONAL' | 'NASIONAL' | 'INTERNASIONAL' | 'JAWA_BARAT'
  tag?: string
  status?: string
  isPublicHoliday?: boolean
  description?: string
  contentBrief?: string
  topic?: string
  badgeClass: string
  borderClass: string
  categoryLabel: string
}

export interface UserContentPlanItem {
  id: string
  title: string
  planned_date: string
  status: string
  topic?: string
  target_platform_id?: string
  platform_name?: string
  brief?: string
  posting_category?: string
}

const FIXED_PUBLIC_HOLIDAYS = [
  { month: 1, day: 1, name: 'Tahun Baru Masehi' },
  { month: 5, day: 1, name: 'Hari Buruh Internasional (May Day)' },
  { month: 6, day: 1, name: 'Hari Lahir Pancasila' },
  { month: 8, day: 17, name: 'HUT Proklamasi Kemerdekaan RI' },
  { month: 12, day: 25, name: 'Hari Raya Natal' },
]

export type CalendarFilterType = 'ALL' | 'PLN' | 'JAWA_BARAT' | 'NASIONAL'

const CATEGORY_FILTER_OPTIONS = [
  { id: 'PLN', label: 'Agenda PLN', color: 'bg-[#0072B2]' },
  { id: 'JAWA_BARAT', label: 'Event Jawa Barat', color: 'bg-purple-600' },
  { id: 'LIBUR_NASIONAL', label: 'Libur Nasional', color: 'bg-rose-600' },
  { id: 'INTERNASIONAL', label: 'Lingkungan & Internasional', color: 'bg-emerald-500' },
  { id: 'NASIONAL', label: 'Hari Besar Nasional', color: 'bg-amber-500' },
]

export default function ContentCalendarPage() {
  const router = useRouter()
  const [importantEvents, setImportantEvents] = useState<ImportantEvent[]>([])
  const [userContents, setUserContents] = useState<UserContentPlanItem[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'PLN',
    'JAWA_BARAT',
    'LIBUR_NASIONAL',
    'INTERNASIONAL',
    'NASIONAL',
  ])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month')
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Status collapse kartu "Jadwal Konten Rutin Bulanan PLN"
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

  // Right Side Drawer state
  const [selectedDateDrawer, setSelectedDateDrawer] = useState<{
    date: Date
    dateStr: string
    isHoliday: boolean
    agendas: DayAgendaItem[]
    contentPlans: UserContentPlanItem[]
    activeRoutines: PLNMonthlyRoutine[]
    totalCount: number
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

      const [eventsRes, contentsRes] = await Promise.all([
        apiFetch(`/api/important-events?${eventsParams.toString()}`),
        apiFetch(`/api/contents?include_savings=false`),
      ])

      const eventsData = eventsRes.ok ? await eventsRes.json() : { events: [] }
      const contentsData = contentsRes.ok ? await contentsRes.json() : { contents: [] }

      setImportantEvents(eventsData.events || [])
      setUserContents(contentsData.contents || [])
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

    // Split 42 days into 6 week rows
    const weeks: { date: Date; isCurrentMonth: boolean }[][] = []
    for (let w = 0; w < days.length; w += 7) {
      weeks.push(days.slice(w, w + 7))
    }

    return { days, weeks, totalWeeks: weeks.length }
  }, [currentDate])

  // Mapping Rencana Konten yang dibuat User per tanggal (YYYY-MM-DD)
  const userPlansByDate = useMemo(() => {
    const map = new Map<string, UserContentPlanItem[]>()
    userContents.forEach((item) => {
      if (!item.planned_date) return
      // Normalisasi format tanggal (YYYY-MM-DD)
      const dateKey = item.planned_date.split('T')[0]
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)?.push(item)
    })
    return map
  }, [userContents])

  // Hitung agenda & momentum per hari (1..31) tanpa duplikasi teks di setiap cell rutin
  const agendasByDay = useMemo(() => {
    const map = new Map<number, DayAgendaItem[]>()
    const month = currentDate.getMonth() + 1

    for (let d = 1; d <= 31; d++) {
      map.set(d, [])
    }

    // 1. Libur Nasional Tetap
    if (selectedCategories.includes('LIBUR_NASIONAL')) {
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

    // 2. Agenda Rutin PLN Tanggal Spesifik (Tgl 3 Tagihan Terbit & Tgl 20 Batas Akhir)
    if (selectedCategories.includes('PLN')) {
      PLN_MONTHLY_ROUTINES.filter((r) => r.isExactDay).forEach((routine) => {
        map.get(routine.dayStart)?.push({
          id: `${routine.id}-${routine.dayStart}`,
          name: routine.name,
          category: 'PLN_ROUTINE',
          type: 'PLN',
          categoryLabel: 'Agenda PLN',
          tag: routine.tag,
          description: routine.description,
          contentBrief: routine.contentBrief,
          topic: routine.topic,
          badgeClass: routine.badgeClass,
          borderClass: routine.borderClass,
        })
      })
    }

    // 3. Important Events dari Database
    importantEvents.forEach((ev) => {
      const isPublicHoliday = ev.status === 'LIBUR_NASIONAL'
      const isJabarEvent =
        ev.category === 'JAWA_BARAT' ||
        ev.name.toLowerCase().includes('jawa barat') ||
        ev.name.toLowerCase().includes('jabar') ||
        ev.name.toLowerCase().includes('bandung') ||
        ev.name.toLowerCase().includes('sunda') ||
        ev.name.toLowerCase().includes('bogor') ||
        ev.name.toLowerCase().includes('depok') ||
        ev.name.toLowerCase().includes('sumedang') ||
        ev.name.toLowerCase().includes('tasikmalaya') ||
        ev.name.toLowerCase().includes('angklung')
      const isPLNEvent =
        (ev.name.toLowerCase().includes('pln') ||
          ev.name.toLowerCase().includes('listrik') ||
          (ev.category === 'HUT_INSTANSI' && ev.name.toLowerCase().includes('pln'))) &&
        !isJabarEvent

      // Filter kategori terdistribusi
      if (isJabarEvent && !selectedCategories.includes('JAWA_BARAT')) return
      if (isPLNEvent && !selectedCategories.includes('PLN')) return
      if (isPublicHoliday && !selectedCategories.includes('LIBUR_NASIONAL')) return
      if (
        !isJabarEvent &&
        !isPLNEvent &&
        !isPublicHoliday &&
        (ev.category === 'INTERNASIONAL' || ev.category === 'LINGKUNGAN') &&
        !selectedCategories.includes('INTERNASIONAL')
      )
        return
      if (
        !isJabarEvent &&
        !isPLNEvent &&
        !isPublicHoliday &&
        ev.category !== 'INTERNASIONAL' &&
        ev.category !== 'LINGKUNGAN' &&
        !selectedCategories.includes('NASIONAL')
      )
        return

      const existingList = map.get(ev.day) || []
      const duplicateIndex = existingList.findIndex(
        (it) => it.name.toLowerCase() === ev.name.toLowerCase()
      )

      if (duplicateIndex >= 0) {
        existingList[duplicateIndex].description = ev.description || existingList[duplicateIndex].description
        return
      }

      let itemType: 'PLN' | 'LIBUR_NASIONAL' | 'NASIONAL' | 'INTERNASIONAL' | 'JAWA_BARAT' = 'NASIONAL'
      let badgeClass = ''
      let borderClass = ''
      let categoryLabel = 'Hari Besar Nasional'

      if (isJabarEvent || ev.category === 'JAWA_BARAT') {
        itemType = 'JAWA_BARAT'
        categoryLabel = 'Event Jawa Barat'
        badgeClass =
          'bg-purple-100 text-purple-950 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-700 font-semibold'
        borderClass = 'border-l-4 border-l-purple-600'
      } else if (isPLNEvent) {
        itemType = 'PLN'
        categoryLabel = 'Agenda PLN'
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
  }, [importantEvents, selectedCategories, currentDate])

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
    setSelectedDateDrawer(null)
    const title =
      item.type === 'PLN'
        ? `Konten Rutin: ${item.name}`
        : item.type === 'JAWA_BARAT'
        ? `Konten Event Jabar: ${item.name}`
        : `Peringatan ${item.name}`
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
    setSelectedDateDrawer(null)
    router.push(`/content/planning/new?planned_date=${dateStr}`)
  }

  function openDateDrawer(date: Date, dateStr: string, dayAgendas: DayAgendaItem[]) {
    const dayNum = date.getDate()
    const contentPlans = userPlansByDate.get(dateStr) || []
    const isHoliday = dayAgendas.some((a) => a.isPublicHoliday)

    // Cek apakah tanggal ini berada dalam periode aman bayar (3-19) atau SwaCAM (23-27)
    const activeRoutines = PLN_MONTHLY_ROUTINES.filter(
      (r) => !r.isExactDay && dayNum >= r.dayStart && dayNum <= r.dayEnd
    )

    const totalCount = dayAgendas.length + contentPlans.length

    setSelectedDateDrawer({
      date,
      dateStr,
      isHoliday,
      agendas: dayAgendas,
      contentPlans,
      activeRoutines,
      totalCount,
    })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2 overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. JADWAL KONTEN RUTIN BULANAN PLN (COMPACT & COLLAPSIBLE BANNER)          */}
      {/* ========================================================================= */}
      <div className="shrink-0 rounded-xl border border-sky-200/80 bg-gradient-to-r from-sky-50/70 via-white to-sky-50/40 p-2.5 shadow-2xs dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30">
        <div
          className="flex items-center justify-between cursor-pointer select-none"
          onClick={toggleRoutineCollapsed}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#0072B2] text-white shadow-2xs">
              <CalendarDays className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <h4 className="text-xs font-bold text-[#0072B2] dark:text-sky-300 truncate">
                Jadwal Konten Rutin Bulanan PLN
              </h4>
              <span className="hidden md:inline text-[11px] text-ink-muted truncate">
                · Siklus agenda tetap setiap bulan untuk edukasi & pelayanan pelanggan
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Aktif
            </span>
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

        {!isRoutineCollapsed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2.5 pt-2.5 border-t border-sky-100/70">
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
                <h5 className="text-xs font-bold text-ink truncate">{routine.name}</h5>
                <p className="text-[11px] text-ink-muted leading-tight line-clamp-1">
                  {routine.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. CALENDAR CARD (TOOLBAR COMPACT & GRID KALENDER OVERVIEW)              */}
      {/* ========================================================================= */}
      <Card className="shadow-xs flex-1 min-h-0 flex flex-col overflow-hidden border">
        {/* Single-Row Toolbar Compact */}
        <CardHeader className="border-b py-2 px-3 shrink-0 bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Navigasi Bulan & Hari Ini */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevMonth}
                title="Bulan Sebelumnya"
                className="h-7 w-7 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-sm sm:text-base font-bold text-ink tracking-tight flex items-center gap-1.5 min-w-[140px] justify-center">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMonth}
                title="Bulan Berikutnya"
                className="h-7 w-7 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="h-7 text-xs font-semibold px-2.5 rounded-lg"
              >
                Hari Ini
              </Button>
            </div>

            {/* Right Side Controls: Popover Filter & View Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Dropdown Popover Filter Kategori */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="h-7 text-xs font-semibold px-2.5 flex items-center gap-1.5 bg-surface border-border hover:bg-surface-muted"
                >
                  <Filter className="h-3.5 w-3.5 text-[#0072B2] shrink-0" />
                  <span>
                    {selectedCategories.length === 5
                      ? 'Filter: Semua Kategori'
                      : `Filter (${selectedCategories.length})`}
                  </span>
                  <ChevronDown className="h-3 w-3 text-ink-muted" />
                </Button>

                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsFilterOpen(false)} />
                    <div className="absolute right-0 mt-1 z-40 w-56 p-2 rounded-xl border border-border bg-surface shadow-lg space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCategories([
                            'PLN',
                            'JAWA_BARAT',
                            'LIBUR_NASIONAL',
                            'INTERNASIONAL',
                            'NASIONAL',
                          ])
                        }
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-surface-muted text-ink font-bold transition"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`h-4 w-4 rounded flex items-center justify-center border transition ${
                              selectedCategories.length === 5
                                ? 'bg-[#0072B2] border-[#0072B2] text-white'
                                : 'border-border'
                            }`}
                          >
                            {selectedCategories.length === 5 && <Check className="h-3 w-3" />}
                          </span>
                          Semua Kategori
                        </span>
                      </button>
                      <div className="h-px bg-border my-1" />
                      {CATEGORY_FILTER_OPTIONS.map((cat) => {
                        const isSelected = selectedCategories.includes(cat.id)
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                if (selectedCategories.length > 1) {
                                  setSelectedCategories(
                                    selectedCategories.filter((c) => c !== cat.id)
                                  )
                                }
                              } else {
                                setSelectedCategories([...selectedCategories, cat.id])
                              }
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1 rounded-lg hover:bg-surface-muted text-ink transition"
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`h-4 w-4 rounded flex items-center justify-center border transition ${
                                  isSelected
                                    ? 'bg-[#0072B2] border-[#0072B2] text-white'
                                    : 'border-border'
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                              </span>
                              <span className={`h-2 w-2 rounded-full ${cat.color}`} />
                              {cat.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
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

        {/* Grid Kalender Month View Overview */}
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

              {/* Grid Baris Minggu (Continuous Multi-Day Period Bars & Cell Overview) */}
              <div
                className="grid flex-1 min-h-0 border-collapse"
                style={{ gridTemplateRows: `repeat(${calendar.totalWeeks}, minmax(0, 1fr))` }}
              >
                {calendar.weeks.map((weekDays, weekIdx) => {
                  // Cek apakah ada agenda rutin multi-day (Periode Aman Bayar Tgl 3-19 atau SwaCAM Tgl 23-27) yang aktif di minggu ini
                  const weekActiveRoutines = selectedCategories.includes('PLN')
                    ? PLN_MONTHLY_ROUTINES.filter((r) => {
                        if (r.isExactDay) return false
                        return weekDays.some((d) => {
                          if (!d.isCurrentMonth) return false
                          const dayNum = d.date.getDate()
                          return dayNum >= r.dayStart && dayNum <= r.dayEnd
                        })
                      })
                    : []

                  return (
                    <div key={weekIdx} className="flex flex-col border-b min-h-0 overflow-hidden">
                      {/* Sub-bar Period Ribbon Multi-Day jika ada agenda rutin di minggu ini */}
                      {weekActiveRoutines.length > 0 && (
                        <div className="bg-sky-50/70 border-b border-sky-100 dark:bg-sky-950/30 px-2 py-0.5 flex flex-wrap items-center gap-2 shrink-0">
                          {weekActiveRoutines.map((rt) => (
                            <div
                              key={rt.id}
                              className="inline-flex items-center gap-1.5 px-2 py-0.2 rounded text-[10px] font-semibold bg-sky-100 text-sky-950 border border-sky-300 dark:bg-sky-900/80 dark:text-sky-200 dark:border-sky-700 shadow-2xs"
                              title={`${rt.name} (${rt.tag}): ${rt.description}`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-[#0072B2]" />
                              <span className="truncate">{rt.name}</span>
                              <span className="text-[9px] opacity-80">({rt.tag})</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 7 Cell Tanggal dalam Minggu Ini */}
                      <div className="grid grid-cols-7 border-collapse flex-1 min-h-0">
                        {weekDays.map((day, dayIdx) => {
                          const dayNum = day.date.getDate()
                          const dateStr = `${day.date.getFullYear()}-${String(
                            day.date.getMonth() + 1
                          ).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`

                          const dayAgendas = day.isCurrentMonth
                            ? agendasByDay.get(dayNum) || []
                            : []
                          const dayPlans = day.isCurrentMonth
                            ? userPlansByDate.get(dateStr) || []
                            : []

                          const isSunday = day.date.getDay() === 0
                          const isSaturday = day.date.getDay() === 6
                          const isPublicHoliday =
                            day.isCurrentMonth && dayAgendas.some((a) => a.isPublicHoliday)

                          // Limit 1-2 chips per cell
                          const maxCellPreview = 2
                          const totalItemsCount = dayAgendas.length + dayPlans.length
                          const visibleAgendas = dayAgendas.slice(0, maxCellPreview)
                          const remainingSlots = Math.max(0, maxCellPreview - visibleAgendas.length)
                          const visiblePlans = dayPlans.slice(0, remainingSlots)
                          const totalVisible = visibleAgendas.length + visiblePlans.length
                          const hiddenCount = totalItemsCount - totalVisible

                          return (
                            <div
                              key={dayIdx}
                              onClick={() => {
                                if (day.isCurrentMonth) {
                                  openDateDrawer(day.date, dateStr, dayAgendas)
                                }
                              }}
                              className={`h-full overflow-hidden border-r p-1 transition-all flex flex-col justify-between group ${
                                !day.isCurrentMonth
                                  ? 'bg-slate-50/40 text-ink-muted dark:bg-slate-900/30 opacity-40 cursor-default'
                                  : 'cursor-pointer hover:bg-sky-50/40 dark:hover:bg-sky-950/20'
                              } ${
                                isToday(day.date)
                                  ? 'bg-blue-50/70 dark:bg-blue-950/20 ring-2 ring-inset ring-primary/50'
                                  : isPublicHoliday
                                  ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-900/50'
                                  : isSunday
                                  ? 'bg-rose-50/20 dark:bg-rose-950/10'
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
                                        ? 'bg-[#0072B2] font-bold text-white shadow-2xs'
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
                                        title="Hari Libur Nasional"
                                      >
                                        <Flag className="h-2 w-2" />
                                        Libur
                                      </span>
                                    )}
                                    {day.isCurrentMonth &&
                                      totalItemsCount > 0 &&
                                      !isPublicHoliday && (
                                        <span className="text-[9px] font-semibold text-ink-muted">
                                          {totalItemsCount} item
                                        </span>
                                      )}
                                  </div>
                                </div>

                                {/* Preview Item Chips Minimalis (Max 1-2 per cell) */}
                                <div className="space-y-0.5 overflow-hidden flex-1 min-h-0">
                                  {/* Agenda / Momentum Chips */}
                                  {visibleAgendas.map((item) => (
                                    <div
                                      key={item.id}
                                      className={`rounded px-1.5 py-0.2 text-[10px] truncate transition flex items-center gap-1 ${item.badgeClass}`}
                                      title={`[${item.categoryLabel}] ${item.name}`}
                                    >
                                      <span
                                        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                          item.type === 'PLN'
                                            ? 'bg-[#0072B2]'
                                            : item.type === 'JAWA_BARAT'
                                            ? 'bg-purple-600'
                                            : item.type === 'LIBUR_NASIONAL'
                                            ? 'bg-rose-600'
                                            : item.type === 'INTERNASIONAL'
                                            ? 'bg-emerald-500'
                                            : 'bg-amber-500'
                                        }`}
                                      />
                                      <span className="truncate font-medium">{item.name}</span>
                                    </div>
                                  ))}

                                  {/* User Rencana Konten Chips */}
                                  {visiblePlans.map((plan) => (
                                    <div
                                      key={plan.id}
                                      className="rounded px-1.5 py-0.2 text-[10px] truncate transition flex items-center gap-1 bg-sky-50 text-sky-950 border border-sky-200 dark:bg-sky-950/80 dark:text-sky-200 font-medium"
                                      title={`Rencana Konten: ${plan.title}`}
                                    >
                                      <FileText className="h-2.5 w-2.5 text-[#0072B2] shrink-0" />
                                      <span className="truncate">{plan.title}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Indicator "+N lainnya" jika overflow */}
                              {hiddenCount > 0 && (
                                <div className="mt-0.5 shrink-0">
                                  <span className="w-full inline-flex items-center justify-center py-0.2 text-[9px] font-semibold text-[#0072B2] bg-sky-50 rounded border border-sky-200 hover:bg-sky-100 transition">
                                    +{hiddenCount} agenda lainnya
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 3. DETAIL ON DEMAND: RIGHT SIDE DRAWER PANEL                              */}
      {/* ========================================================================= */}
      {selectedDateDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface h-full shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-300">
            {/* Header Drawer */}
            <div
              className={`p-4 border-b shrink-0 flex items-center justify-between ${
                selectedDateDrawer.isHoliday
                  ? 'bg-rose-50/80 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900'
                  : 'bg-surface-muted/60 border-border'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0072B2] text-white shadow-2xs">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2">
                    <span>
                      {FULL_DAYS[selectedDateDrawer.date.getDay()]},{' '}
                      {selectedDateDrawer.date.getDate()}{' '}
                      {MONTHS[selectedDateDrawer.date.getMonth()]}{' '}
                      {selectedDateDrawer.date.getFullYear()}
                    </span>
                    {selectedDateDrawer.isHoliday && (
                      <Badge className="bg-rose-600 text-white text-[10px] font-bold">
                        Libur
                      </Badge>
                    )}
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {selectedDateDrawer.totalCount} agenda & rencana konten terdaftar
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDateDrawer(null)}
                className="h-8 w-8 rounded-full text-ink-muted hover:bg-black/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Isi Detail Drawer (Scrollable) */}
            <div className="p-4 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* SECTION 1: AGENDA & MOMENTUM */}
              {selectedDateDrawer.agendas.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-ink text-xs tracking-tight flex items-center gap-1.5">
                      <Flag className="h-3.5 w-3.5 text-amber-500" />
                      Agenda & Momentum Hari Ini
                    </h4>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {selectedDateDrawer.agendas.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {selectedDateDrawer.agendas.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border bg-surface space-y-2 shadow-2xs ${item.borderClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${item.badgeClass}`}
                          >
                            {item.categoryLabel}
                          </Badge>
                          {item.tag && (
                            <span className="text-[10px] font-medium text-ink-muted">
                              {item.tag}
                            </span>
                          )}
                        </div>
                        <h5 className="font-bold text-ink text-xs leading-snug">{item.name}</h5>
                        {item.description && (
                          <p className="text-[11px] text-ink-secondary leading-relaxed bg-surface-muted/60 p-2 rounded-lg border border-border/80">
                            {item.description}
                          </p>
                        )}
                        <Button
                          size="sm"
                          onClick={() =>
                            handleCreateContentForAgenda(item, selectedDateDrawer.dateStr)
                          }
                          className="h-7 text-[11px] font-semibold bg-[#0072B2] hover:bg-[#005a8d] text-white w-full shadow-2xs mt-1"
                        >
                          <BookmarkPlus className="mr-1.5 h-3.5 w-3.5" /> Buat Rencana Konten
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: RENCANA KONTEN USER */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-ink text-xs tracking-tight flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#0072B2]" />
                    Rencana Konten Tersusun ({selectedDateDrawer.contentPlans.length})
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCreateGeneralContent(selectedDateDrawer.dateStr)}
                    className="h-6 text-[10px] font-semibold px-2"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Buat Baru
                  </Button>
                </div>

                {selectedDateDrawer.contentPlans.length === 0 ? (
                  <div className="p-4 text-center border border-dashed rounded-xl bg-surface-muted/40 text-ink-muted space-y-1">
                    <p className="font-medium text-xs">Belum ada rencana konten untuk tanggal ini.</p>
                    <p className="text-[11px] text-ink-muted">
                      Klik tombol di bawah untuk menjadwalkan ide konten baru.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDateDrawer.contentPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-3 rounded-xl border border-sky-200 bg-sky-50/40 dark:bg-slate-900/90 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[#0072B2]">
                            <PlatformIconOnly
                              platform={plan.platform_name || plan.target_platform_id || ''}
                              size="sm"
                            />
                            {plan.platform_name || 'Multi-platform'}
                          </span>
                          <StatusBadge status={plan.status as any} />
                        </div>
                        <h5 className="font-bold text-ink text-xs leading-snug">{plan.title}</h5>
                        {plan.topic && (
                          <p className="text-[11px] text-ink-muted">Topik: {plan.topic}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 3: SIKLUS RUTIN BULANAN PLN (JIKA DALAM PERIODE) */}
              {selectedDateDrawer.activeRoutines.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border">
                  <h4 className="font-bold text-ink text-xs tracking-tight flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#0072B2]" />
                    Siklus Agenda Rutin PLN Active Range
                  </h4>
                  <div className="space-y-2">
                    {selectedDateDrawer.activeRoutines.map((rt) => (
                      <div
                        key={rt.id}
                        className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/30 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sky-950 text-xs">{rt.name}</span>
                          <Badge variant="outline" className="text-[9px] bg-white text-sky-900">
                            {rt.tag}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          {rt.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Drawer */}
            <div className="p-3.5 border-t border-border bg-surface-muted/40 flex items-center justify-between gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDateDrawer(null)}
                className="h-8 text-xs rounded-lg"
              >
                Tutup
              </Button>
              <Button
                size="sm"
                onClick={() => handleCreateGeneralContent(selectedDateDrawer.dateStr)}
                className="h-8 text-xs font-semibold rounded-lg bg-[#0072B2] hover:bg-[#005a8d] text-white shadow-2xs"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Buat Rencana Konten
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
