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
        Filters
      </div>

      <div>
        <label htmlFor="filter-date-from" className="mb-1 block text-xs text-ink-muted">
          From
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
          To
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
          <option value="">All</option>
          {masterData.platforms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="filter-pillar" className="mb-1 block text-xs text-ink-muted">
          Pillar
        </label>
        <Select
          id="filter-pillar"
          value={filters.pillar_id}
          onChange={(e) => set('pillar_id', e.target.value)}
          className="w-full sm:w-40"
        >
          <option value="">All</option>
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
            <option value="">All</option>
            <option value="DRAFT">Draft</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="REVISION_REQUIRED">Revision Required</option>
            <option value="APPROVED">Approved</option>
            <option value="READY_TO_PUBLISH">Ready to Publish</option>
            <option value="PUBLISHED">Published</option>
            <option value="RESCHEDULED">Rescheduled</option>
            <option value="NOT_REALIZED">Not Realized</option>
          </Select>
        </div>
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
          <X className="mr-1 h-3 w-3" aria-hidden="true" />
          Clear
        </Button>
      )}
    </div>
  )
}
