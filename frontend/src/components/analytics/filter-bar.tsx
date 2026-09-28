import { useState, useEffect, useMemo } from 'react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Filter, X } from 'lucide-react'
import { PLN_TOPIC_OPTIONS, CONTENT_PILLAR_OPTIONS } from '@/constants'
import { apiFetch } from '@/lib/api'
import type { PlanningPeriod } from '@/types'

export interface FilterValues {
  period_id?: string
  month?: string
  date_from: string
  date_to: string
  platform_id: string
  topic: string
  pillar_id: string
  status: string
}

export const EMPTY_FILTERS: FilterValues = {
  period_id: '',
  month: '',
  date_from: '',
  date_to: '',
  platform_id: '',
  topic: '',
  pillar_id: '',
  status: '',
}

interface FilterBarProps {
  filters: FilterValues
  onChange: (filters: FilterValues) => void
  showStatus?: boolean
  masterData: {
    pillars: Array<{ id: string; name: string }>
    platforms: Array<{ id: string; name: string }>
  }
}

const MONTH_NAMES = [
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

import { getAutoSemesters } from '@/lib/utils'

export function FilterBar({ filters, onChange, showStatus = true, masterData }: FilterBarProps) {
  const [dbPeriods, setDbPeriods] = useState<PlanningPeriod[]>([])

  useEffect(() => {
    apiFetch('/api/planning-periods')
      .then((r) => (r.ok ? r.json() : { periods: [] }))
      .then((data) => {
        setDbPeriods(data.periods || [])
      })
      .catch((err) => console.error('Failed to load planning periods in FilterBar:', err))
  }, [])

  const allSemesterOptions = useMemo(() => {
    if (dbPeriods.length > 0) {
      return dbPeriods.map((p) => ({
        id: p.id,
        name: p.name,
        start_date: p.start_date,
        end_date: p.end_date,
      }))
    }
    return getAutoSemesters(3, 1)
  }, [dbPeriods])

  const currentPeriod = useMemo(() => {
    return allSemesterOptions.find((p) => p.id === filters.period_id) || null
  }, [allSemesterOptions, filters.period_id])

  const availableMonths = useMemo(() => {
    if (!currentPeriod || !currentPeriod.start_date || !currentPeriod.end_date) return []

    const start = new Date(currentPeriod.start_date)
    const end = new Date(currentPeriod.end_date)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return []

    const months: Array<{ key: string; name: string; startDate: string; endDate: string }> = []
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    const last = new Date(end.getFullYear(), end.getMonth(), 1)

    while (cur <= last) {
      const y = cur.getFullYear()
      const m = cur.getMonth()
      const mKey = `${y}-${String(m + 1).padStart(2, '0')}`
      const mName = `${MONTH_NAMES[m]} ${y}`

      const mStart = `${y}-${String(m + 1).padStart(2, '0')}-01`
      const lastDayDate = new Date(y, m + 1, 0)
      const mEnd = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`

      months.push({ key: mKey, name: mName, startDate: mStart, endDate: mEnd })
      cur.setMonth(cur.getMonth() + 1)
    }

    return months
  }, [currentPeriod])

  const handlePeriodSelect = (periodId: string) => {
    if (!periodId) {
      onChange({
        ...filters,
        period_id: '',
        month: '',
        date_from: '',
        date_to: '',
      })
      return
    }

    const p = allSemesterOptions.find((item) => item.id === periodId)
    if (p) {
      onChange({
        ...filters,
        period_id: periodId,
        month: '',
        date_from: p.start_date,
        date_to: p.end_date,
      })
    } else {
      onChange({ ...filters, period_id: periodId, month: '' })
    }
  }

  const handleMonthSelect = (monthKey: string) => {
    if (!monthKey) {
      if (currentPeriod) {
        onChange({
          ...filters,
          month: '',
          date_from: currentPeriod.start_date,
          date_to: currentPeriod.end_date,
        })
      } else {
        onChange({ ...filters, month: '', date_from: '', date_to: '' })
      }
      return
    }

    const m = availableMonths.find((item) => item.key === monthKey)
    if (m) {
      onChange({
        ...filters,
        month: monthKey,
        date_from: m.startDate,
        date_to: m.endDate,
      })
    } else {
      onChange({ ...filters, month: monthKey })
    }
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== '' && v !== undefined)

  const set = (key: keyof FilterValues, value: string) => {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-ink-secondary">
        <Filter className="h-4 w-4" aria-hidden="true" />
        Filter Data
      </div>

      {/* Satu baris rapi: grid dengan kolom selebar-rata; di layar kecil
          turun ke 2–3 kolom yang tetap sejajar (bukan wrap acak). */}
      <div
        className="grid grid-cols-2 items-end gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] xl:grid-cols-6"
        style={{ gridAutoRows: 'minmax(2.25rem, auto)' }}
      >
        {/* Periode Semester */}
        <div>
          <label htmlFor="filter-period" className="mb-1 block text-xs text-ink-muted">
            Periode Semester
          </label>
          <Select
            id="filter-period"
            value={filters.period_id || ''}
            onChange={(e) => handlePeriodSelect(e.target.value)}
            className="w-full font-normal"
          >
            <option value="">Semua Periode</option>
            {allSemesterOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Pilih Bulan */}
        <div>
          <label htmlFor="filter-month" className="mb-1 block text-xs text-ink-muted">
            Pilih Bulan
          </label>
          <Select
            id="filter-month"
            value={filters.month || ''}
            onChange={(e) => handleMonthSelect(e.target.value)}
            disabled={!filters.period_id}
            className="w-full font-normal"
          >
            <option value="">Semua Bulan di Semester Ini</option>
            {availableMonths.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="filter-platform" className="mb-1 block text-xs text-ink-muted">
            Platform
          </label>
          <Select
            id="filter-platform"
            value={filters.platform_id}
            onChange={(e) => set('platform_id', e.target.value)}
            className="w-full font-normal"
          >
            <option value="">Semua Platform</option>
            {masterData.platforms
              .filter(
                (p) =>
                  !['linkedin', 'website'].includes(
                    p.name.toLowerCase().trim()
                  )
              )
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </div>

        <div>
          <label htmlFor="filter-topic" className="mb-1 block text-xs text-ink-muted">
            Topik Konten
          </label>
          <Select
            id="filter-topic"
            value={filters.topic}
            onChange={(e) => set('topic', e.target.value)}
            className="w-full font-normal"
          >
            <option value="">Semua Topik Konten</option>
            {PLN_TOPIC_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="filter-pillar" className="mb-1 block text-xs text-ink-muted">
            Content Pillar
          </label>
          <Select
            id="filter-pillar"
            value={filters.pillar_id}
            onChange={(e) => set('pillar_id', e.target.value)}
            className="w-full font-normal"
          >
            <option value="">Semua Content Pillar</option>
            {CONTENT_PILLAR_OPTIONS.map((cp) => {
              const match = masterData.pillars.find(
                (p) =>
                  p.name.toLowerCase() === cp.toLowerCase() ||
                  p.name.toLowerCase().startsWith(cp.split(' ')[0].toLowerCase())
              )
              const val = match ? match.id : cp
              return (
                <option key={cp} value={val}>
                  {cp}
                </option>
              )
            })}
          </Select>
        </div>

        {showStatus && (
          <div>
            <label htmlFor="filter-status" className="mb-1 block text-xs text-ink-muted">
              Status
            </label>
            <Select
              id="filter-status"
              value={filters.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full font-normal"
            >
              <option value="">Semua Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_REVIEW">Menunggu Persetujuan Konsep</option>
              <option value="APPROVED">Konsep Disetujui</option>
              <option value="PRODUCTION">Produksi Konten</option>
              <option value="PENDING_PRODUCTION_REVIEW">Menunggu Review Produksi</option>
              <option value="READY_TO_PUBLISH">Siap Publikasi</option>
              <option value="PUBLISHED">Dipublikasikan</option>
              <option value="REJECTED">Ditolak</option>
              <option value="RESCHEDULED">Dijadwalkan Ulang</option>
              <option value="NOT_REALIZED">Tidak Direalisasikan</option>
            </Select>
          </div>
        )}

        {hasActiveFilters && (
          <div className="col-span-2 flex items-end sm:col-span-1 lg:col-span-1 xl:col-span-1">
            <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
              <X className="mr-1 h-3 w-3" aria-hidden="true" />
              Reset Filter
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

