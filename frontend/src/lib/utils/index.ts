import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateWithDay(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  const dayName = INDO_DAYS[d.getDay()]
  const dateFormatted = d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `${dayName}, ${dateFormatted}`
}

export function getWeekOfMonth(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  const weekNum = Math.ceil(d.getDate() / 7)
  return `Minggu ${weekNum}`
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function calculateEngagementRate(metrics: {
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
}): number {
  if (metrics.reach === 0) return 0
  const engagement = metrics.likes + metrics.comments + metrics.shares + metrics.saves
  return (engagement / metrics.reach) * 100
}

export function getWeekNumber(date: Date): number {
  return Math.ceil(date.getDate() / 7)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

// --- Period Date Range helpers (Monthly & Semester Recap) ---

export type PeriodMode = 'monthly' | 'semester'

export interface PeriodDateRange {
  dateFrom: string // ISO YYYY-MM-DD
  dateTo: string   // ISO YYYY-MM-DD
  label: string
}

const MONTH_LABELS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/**
 * Returns { dateFrom, dateTo, label } for a given year, mode, and period.
 *
 * Modes:
 *   - "monthly": period = 1-12. Start = 1st day, End = last day of month.
 *   - "semester": period = 1 or 2. S1 = Jan 1 – Jun 30, S2 = Jul 1 – Dec 31.
 *
 * Uses ISO date strings (YYYY-MM-DD) to avoid timezone shift.
 */
export function getPeriodDateRange(year: number, mode: PeriodMode, period: number): PeriodDateRange {
  switch (mode) {
    case 'semester':
      if (period === 1) {
        return {
          dateFrom: `${pad4(year)}-01-01`,
          dateTo: `${pad4(year)}-06-30`,
          label: `Semester 1 ${year}`,
        }
      }
      return {
        dateFrom: `${pad4(year)}-07-01`,
        dateTo: `${pad4(year)}-12-31`,
        label: `Semester 2 ${year}`,
      }
    default: // "monthly"
      const p = clamp(period, 1, 12)
      const start = new Date(Date.UTC(year, p - 1, 1))
      const end = new Date(Date.UTC(year, p, 0)) // last day of month p-1
      return {
        dateFrom: toISODate(start),
        dateTo: toISODate(end),
        label: `${MONTH_LABELS_FULL[p - 1]} ${year}`,
      }
  }
}

function pad4(n: number): string {
  return String(n).padStart(4, '0')
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}

function toISODate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  return `${pad4(y)}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
