'use client'

import { Card } from '@/components/ui/card'
import { FileText, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { Content } from '@/types'

interface ContentPlanningKpiProps {
  contents: Content[]
  activeStatusFilter: string
  activeSpecialFilter?: string | null
  onFilterStatus: (status: string) => void
  onFilterSpecial?: (specialKey: string | null) => void
}

export function ContentPlanningKpi({
  contents,
  activeStatusFilter,
  activeSpecialFilter,
  onFilterStatus,
  onFilterSpecial,
}: ContentPlanningKpiProps) {
  const todayStr = new Date().toISOString().split('T')[0]

  // 1. Total Konten
  const totalContents = contents.length

  // 2. Menunggu Review (PENDING_REVIEW)
  const pendingReviewCount = contents.filter((c) => c.status === 'PENDING_REVIEW').length

  // 3. Siap Tayang (APPROVED atau READY_TO_PUBLISH dan belum dipublikasikan)
  const approvedUnpublishedCount = contents.filter((c) => {
    if (c.status === 'APPROVED' || c.status === 'READY_TO_PUBLISH') {
      const isAlreadyPublished = c.publications?.some((p) => p.status === 'PUBLISHED')
      return !isAlreadyPublished
    }
    return false
  }).length

  // 4. Perlu Tindakan: REVISION_REQUIRED, RESCHEDULED, NOT_REALIZED, atau melewati planned_date tanpa publish
  const followUpCount = contents.filter((c) => {
    // Hindari double count
    if (['REVISION_REQUIRED', 'RESCHEDULED', 'NOT_REALIZED'].includes(c.status)) {
      return true
    }
    // Melewati tanggal rencana publikasi tetapi belum berstatus dipublikasikan
    if (c.planned_date && c.planned_date < todayStr && c.status !== 'PUBLISHED') {
      return true
    }
    return false
  }).length

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {/* Kartu 1: Total Konten */}
      <Card
        onClick={() => {
          onFilterStatus('')
          if (onFilterSpecial) onFilterSpecial(null)
        }}
        className={`group relative flex h-[118px] flex-col justify-between overflow-hidden rounded-xl border p-4 transition-all cursor-pointer shadow-xs hover:shadow-sm ${
          !activeStatusFilter && !activeSpecialFilter
            ? 'border-blue-400/80 bg-blue-50/40 ring-1 ring-blue-400/40 dark:border-blue-800 dark:bg-blue-950/20'
            : 'border-slate-200/80 bg-white hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">
            Total Konten
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <FileText className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-[28px] font-bold leading-none tracking-tight text-slate-900 dark:text-white">
            {totalContents}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Seluruh rencana konten aktif
          </p>
        </div>
      </Card>

      {/* Kartu 2: Menunggu Review */}
      <Card
        onClick={() => {
          onFilterStatus(activeStatusFilter === 'PENDING_REVIEW' ? '' : 'PENDING_REVIEW')
          if (onFilterSpecial) onFilterSpecial(null)
        }}
        className={`group relative flex h-[118px] flex-col justify-between overflow-hidden rounded-xl border p-4 transition-all cursor-pointer shadow-xs hover:shadow-sm ${
          activeStatusFilter === 'PENDING_REVIEW'
            ? 'border-amber-400/80 bg-amber-50/40 ring-1 ring-amber-400/40 dark:border-amber-800 dark:bg-amber-950/20'
            : 'border-slate-200/80 bg-white hover:border-amber-200 dark:border-slate-800 dark:bg-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 truncate">
            Menunggu Review
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-[28px] font-bold leading-none tracking-tight text-amber-900 dark:text-amber-200">
            {pendingReviewCount}
          </div>
          <p className="mt-1.5 text-[11px] text-amber-700/80 dark:text-amber-300/80 truncate">
            Menunggu persetujuan reviewer
          </p>
        </div>
      </Card>

      {/* Kartu 3: Siap Tayang */}
      <Card
        onClick={() => {
          onFilterStatus(activeStatusFilter === 'APPROVED' ? '' : 'APPROVED')
          if (onFilterSpecial) onFilterSpecial(null)
        }}
        className={`group relative flex h-[118px] flex-col justify-between overflow-hidden rounded-xl border p-4 transition-all cursor-pointer shadow-xs hover:shadow-sm ${
          activeStatusFilter === 'APPROVED'
            ? 'border-emerald-400/80 bg-emerald-50/40 ring-1 ring-emerald-400/40 dark:border-emerald-800 dark:bg-emerald-950/20'
            : 'border-slate-200/80 bg-white hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 truncate">
            Siap Tayang
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-[28px] font-bold leading-none tracking-tight text-emerald-900 dark:text-emerald-200">
            {approvedUnpublishedCount}
          </div>
          <p className="mt-1.5 text-[11px] text-emerald-700/80 dark:text-emerald-300/80 truncate">
            Disetujui, siap publikasi
          </p>
        </div>
      </Card>

      {/* Kartu 4: Perlu Tindakan */}
      <Card
        onClick={() => {
          if (onFilterSpecial) {
            onFilterSpecial(activeSpecialFilter === 'follow_up' ? null : 'follow_up')
          }
        }}
        className={`group relative flex h-[118px] flex-col justify-between overflow-hidden rounded-xl border p-4 transition-all cursor-pointer shadow-xs hover:shadow-sm ${
          activeSpecialFilter === 'follow_up'
            ? 'border-rose-400/80 bg-rose-50/40 ring-1 ring-rose-400/40 dark:border-rose-800 dark:bg-rose-950/20'
            : 'border-slate-200/80 bg-white hover:border-rose-200 dark:border-slate-800 dark:bg-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 truncate">
            Perlu Tindakan
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="text-[28px] font-bold leading-none tracking-tight text-rose-900 dark:text-rose-200">
            {followUpCount}
          </div>
          <p className="mt-1.5 text-[11px] text-rose-700/80 dark:text-rose-300/80 truncate">
            Terlambat, revisi, atau kendala
          </p>
        </div>
      </Card>
    </div>
  )
}
