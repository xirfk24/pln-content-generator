'use client'

import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Filter, X } from 'lucide-react'

export interface FilterValues {
  date_from: string
  date_to: string
  platform_id: string
  pillar_id: string
  status: string
}

export const EMPTY_FILTERS: FilterValues = {
  date_from: '',
  date_to: '',
  platform_id: '',
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

export function FilterBar({ filters, onChange, showStatus = true, masterData }: FilterBarProps) {
  const hasActiveFilters = Object.values(filters).some((v) => v !== '')

  const set = (key: keyof FilterValues, value: string) => {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:flex-wrap">
      <div className="flex items-center gap-2 pb-2 text-sm font-medium text-ink-secondary lg:pb-0">
        <Filter className="h-4 w-4" aria-hidden="true" />
        Filter Data
      </div>

      <div>
        <label htmlFor="filter-date-from" className="mb-1 block text-xs text-ink-muted">
          Dari Tanggal
        </label>
        <Input
          id="filter-date-from"
          type="date"
          value={filters.date_from}
          onChange={(e) => set('date_from', e.target.value)}
          className="w-full sm:w-40"
        />
      </div>

      <div>
        <label htmlFor="filter-date-to" className="mb-1 block text-xs text-ink-muted">
          Sampai Tanggal
        </label>
        <Input
          id="filter-date-to"
          type="date"
          value={filters.date_to}
          onChange={(e) => set('date_to', e.target.value)}
          className="w-full sm:w-40"
        />
      </div>

      <div>
        <label htmlFor="filter-platform" className="mb-1 block text-xs text-ink-muted">
          Platform
        </label>
        <Select
          id="filter-platform"
          value={filters.platform_id}
          onChange={(e) => set('platform_id', e.target.value)}
          className="w-full sm:w-40"
        >
          <option value="">Semua Platform</option>
          {masterData.platforms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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
          className="w-full sm:w-44"
        >
          <option value="">Semua Pillar</option>
          {masterData.pillars.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
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
            className="w-full sm:w-44"
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
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
          <X className="mr-1 h-3 w-3" aria-hidden="true" />
          Reset Filter
        </Button>
      )}
    </div>
  )
}
