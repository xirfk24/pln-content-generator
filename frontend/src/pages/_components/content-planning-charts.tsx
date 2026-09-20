'use client'

import { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  CalendarClock,
  AlertTriangle,
  RotateCcw,
  Layers,
  Sparkles,
  Share2,
  BarChart3,
} from 'lucide-react'
import type { Content } from '@/types'
import { CONTENT_PILLAR_OPTIONS } from '@/constants'

interface ContentPlanningChartsProps {
  contents: Content[]
  activeStatusFilter: string
  activeSpecialFilter?: string | null
  activePillarFilter: string
  activePlatformFilter: string
  onFilterStatus: (status: string) => void
  onFilterSpecial?: (specialKey: string | null) => void
  onFilterPillar: (pillarId: string) => void
  onFilterPlatform: (platformId: string) => void
  pillars: Array<{ id: string; name: string }>
  platforms: Array<{ id: string; name: string }>
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94A3B8', // Slate
  IN_PROGRESS: '#F59E0B', // Amber
  PENDING_REVIEW: '#8B5CF6', // Purple / Violet
  APPROVED: '#10B981', // Emerald
  PUBLISHED: '#06B6D4', // Cyan
  REVISION_REQUIRED: '#F43F5E', // Rose
  RESCHEDULED: '#EAB308', // Yellow
  NOT_REALIZED: '#64748B', // Slate
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'Dalam Proses',
  PENDING_REVIEW: 'Menunggu Persetujuan',
  APPROVED: 'Disetujui',
  PUBLISHED: 'Dipublikasikan',
}

const PLATFORM_BRAND_COLORS: Record<string, string> = {
  instagram: '#E4405F',
  facebook: '#1877F2',
  tiktok: '#0F172A',
  youtube: '#EF4444',
  linkedin: '#0A66C2',
  website: '#0D9488',
  twitter: '#0284C7',
  'twitter/x': '#0284C7',
  threads: '#334155',
}

export function ContentPlanningCharts({
  contents,
  activeStatusFilter,
  activeSpecialFilter,
  activePillarFilter,
  activePlatformFilter,
  onFilterStatus,
  onFilterSpecial,
  onFilterPillar,
  onFilterPlatform,
  pillars,
  platforms,
}: ContentPlanningChartsProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showAllPillars, setShowAllPillars] = useState(false)
  const todayStr = new Date().toISOString().split('T')[0]

  // 1. Data Distribusi Status Rencana Konten
  const statusData = useMemo(() => {
    const keys = ['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED']
    return keys.map((key) => {
      const count = contents.filter((c) => c.status === key).length
      return {
        key,
        name: STATUS_LABELS[key] || key,
        count,
        color: STATUS_COLORS[key] || '#64748B',
      }
    })
  }, [contents])

  // 2. Data Kepadatan Konten per Minggu
  const weeklyData = useMemo(() => {
    const weeks = [1, 2, 3, 4, 5]
    return weeks.map((w) => {
      const count = contents.filter((c) => {
        if (c.planned_date) {
          const d = new Date(c.planned_date)
          if (!isNaN(d.getTime())) {
            const weekNum = Math.ceil(d.getDate() / 7)
            return weekNum === w
          }
        }
        return c.planned_week === w
      }).length
      return {
        name: `Minggu ${w}`,
        weekNum: w,
        count,
      }
    })
  }, [contents])

  // 3. Ringkasan Metrik Operasional Tambahan
  const operationalMetrics = useMemo(() => {
    const inProgressCount = contents.filter((c) => (c.status as string) === 'IN_PROGRESS' || c.status === 'PRODUCTION').length
    const draftCount = contents.filter((c) => c.status === 'DRAFT').length
    const publishedCount = contents.filter((c) => c.status === 'PUBLISHED').length
    const notRealizedCount = contents.filter((c) => c.status === 'NOT_REALIZED').length
    const rescheduledCount = contents.filter((c) => c.status === 'RESCHEDULED').length
    const revisionCount = contents.filter((c) => (c.status as string) === 'REVISION_REQUIRED').length
    const overdueCount = contents.filter(
      (c) => c.planned_date && c.planned_date < todayStr && c.status !== 'PUBLISHED'
    ).length

    return [
      {
        id: 'in_progress',
        name: 'Dalam Proses',
        count: inProgressCount,
        icon: Clock,
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
        active: activeStatusFilter === 'IN_PROGRESS',
        onClick: () => {
          onFilterStatus(activeStatusFilter === 'IN_PROGRESS' ? '' : 'IN_PROGRESS')
          if (onFilterSpecial) onFilterSpecial(null)
        },
      },
      {
        id: 'draft',
        name: 'Draft',
        count: draftCount,
        icon: FileText,
        color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
        active: activeStatusFilter === 'DRAFT',
        onClick: () => {
          onFilterStatus(activeStatusFilter === 'DRAFT' ? '' : 'DRAFT')
          if (onFilterSpecial) onFilterSpecial(null)
        },
      },
      {
        id: 'published',
        name: 'Dipublikasikan',
        count: publishedCount,
        icon: CheckCircle2,
        color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 dark:text-cyan-400',
        active: activeStatusFilter === 'PUBLISHED',
        onClick: () => {
          onFilterStatus(activeStatusFilter === 'PUBLISHED' ? '' : 'PUBLISHED')
          if (onFilterSpecial) onFilterSpecial(null)
        },
      },
      {
        id: 'not_realized',
        name: 'Tidak Direalisasikan',
        count: notRealizedCount,
        icon: XCircle,
        color: 'text-slate-500 bg-slate-100 dark:bg-slate-800/80 dark:text-slate-400',
        active: activeStatusFilter === 'NOT_REALIZED',
        onClick: () => {
          onFilterStatus(activeStatusFilter === 'NOT_REALIZED' ? '' : 'NOT_REALIZED')
          if (onFilterSpecial) onFilterSpecial(null)
        },
      },
      {
        id: 'rescheduled',
        name: 'Dijadwalkan Ulang',
        count: rescheduledCount,
        icon: CalendarClock,
        color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 dark:text-yellow-400',
        active: activeStatusFilter === 'RESCHEDULED',
        onClick: () => {
          onFilterStatus(activeStatusFilter === 'RESCHEDULED' ? '' : 'RESCHEDULED')
          if (onFilterSpecial) onFilterSpecial(null)
        },
      },
      {
        id: 'revision',
        name: 'Konten Revisi',
        count: revisionCount,
        icon: RotateCcw,
        color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400',
        active: activeStatusFilter === 'REVISION_REQUIRED',
        onClick: () => {
          onFilterStatus(activeStatusFilter === 'REVISION_REQUIRED' ? '' : 'REVISION_REQUIRED')
          if (onFilterSpecial) onFilterSpecial(null)
        },
      },
      {
        id: 'overdue',
        name: 'Konten Terlambat',
        count: overdueCount,
        icon: AlertTriangle,
        color: 'text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
        active: activeSpecialFilter === 'overdue',
        onClick: () => {
          if (onFilterSpecial) {
            onFilterSpecial(activeSpecialFilter === 'overdue' ? null : 'overdue')
            onFilterStatus('')
          }
        },
      },
    ]
  }, [contents, activeStatusFilter, activeSpecialFilter, onFilterStatus, onFilterSpecial, todayStr])

  // 4. Data Content Pillar (Progress Bar Ringkas)
  const pillarData = useMemo(() => {
    const sourcePillars =
      pillars.length > 0
        ? pillars
        : CONTENT_PILLAR_OPTIONS.map((name) => ({ id: name, name }))

    const total = contents.length || 1

    return sourcePillars
      .map((p) => {
        const count = contents.filter((c) => {
          if (c.pillar_id === p.id) return true
          if (c.pillar?.id === p.id) return true
          if (c.pillar?.name && c.pillar.name.toLowerCase() === p.name.toLowerCase()) return true
          return false
        }).length

        const shortName = p.name.includes('(')
          ? p.name.split('(')[0].trim()
          : p.name

        const percentage = Math.round((count / total) * 100)

        return {
          id: p.id,
          fullName: p.name,
          name: shortName,
          count,
          percentage,
        }
      })
      .sort((a, b) => b.count - a.count)
  }, [contents, pillars])

  // 5. Data Target Platform (Progress Bar Ringkas)
  const platformData = useMemo(() => {
    const sourcePlatforms =
      platforms.length > 0
        ? platforms
        : [
            { id: 'instagram', name: 'Instagram' },
            { id: 'facebook', name: 'Facebook' },
            { id: 'tiktok', name: 'TikTok' },
            { id: 'youtube', name: 'YouTube' },
            { id: 'linkedin', name: 'LinkedIn' },
            { id: 'website', name: 'Website' },
          ]

    const total = contents.length || 1

    return sourcePlatforms
      .map((plat) => {
        const count = contents.filter((c) => {
          if (c.platform_id === plat.id) return true
          if (c.platform?.id === plat.id) return true
          if (c.platform_ids && c.platform_ids.includes(plat.id)) return true
          if (c.platform?.name && c.platform.name.toLowerCase() === plat.name.toLowerCase()) return true
          return false
        }).length

        const platLower = plat.name.toLowerCase()
        const color =
          PLATFORM_BRAND_COLORS[platLower] ||
          (platLower.includes('insta')
            ? '#E4405F'
            : platLower.includes('face')
            ? '#1877F2'
            : platLower.includes('tik')
            ? '#0F172A'
            : platLower.includes('you')
            ? '#EF4444'
            : platLower.includes('link')
            ? '#0A66C2'
            : '#0284C7')

        const percentage = Math.round((count / total) * 100)

        return {
          id: plat.id,
          name: plat.name,
          count,
          percentage,
          color,
        }
      })
      .filter((p) => p.count > 0 || sourcePlatforms.length <= 6)
      .sort((a, b) => b.count - a.count)
  }, [contents, platforms])

  const displayedPillars = showAllPillars ? pillarData : pillarData.slice(0, 5)

  return (
    <div className="w-full">
      {/* DROPDOWN / ACCORDION RINGKASAN LAINNYA */}
      <Card className="border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Toggle Button Header */}
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-800/60 transition-colors text-left"
          aria-expanded={isDropdownOpen}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Ringkasan Lainnya
              </span>
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                Chart distribusi status, kepadatan mingguan, metrik operasional &amp; analitik pilar/platform
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span>{isDropdownOpen ? 'Tutup Ringkasan' : 'Buka Ringkasan'}</span>
            {isDropdownOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-500 transition-transform" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500 transition-transform" />
            )}
          </div>
        </button>

        {/* Content saat Dropdown Terbuka */}
        {isDropdownOpen && (
          <div className="p-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-5">
            {/* 1. SEKSI DUA CHART UTAMA */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* CHART UTAMA 1: Distribusi Status Rencana Konten */}
              <Card className="shadow-xs border-slate-200/80 dark:border-slate-800 flex flex-col justify-between bg-white dark:bg-slate-900">
                <CardHeader className="pb-2.5 border-b bg-surface-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-ink">
                        Distribusi Status Rencana Konten
                      </CardTitle>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        Jumlah konten berdasarkan status workflow saat ini
                      </p>
                    </div>
                    {activeStatusFilter && (
                      <button
                        type="button"
                        onClick={() => onFilterStatus('')}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Reset Status ✕
                      </button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-2 px-3">
                  <div className="h-[230px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={statusData}
                        layout="vertical"
                        margin={{ top: 5, right: 35, left: 35, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" opacity={0.6} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#475569' }}
                          width={115}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                          formatter={(val: any) => [`${val} Konten`, 'Jumlah']}
                          contentStyle={{
                            borderRadius: '8px',
                            fontSize: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                        <Bar
                          dataKey="count"
                          radius={[0, 4, 4, 0]}
                          barSize={18}
                          className="cursor-pointer"
                          onClick={(entry: any) => {
                            const key = entry?.key || entry?.payload?.key
                            if (key) {
                              onFilterStatus(key === activeStatusFilter ? '' : key)
                              if (onFilterSpecial) onFilterSpecial(null)
                            }
                          }}
                        >
                          {statusData.map((entry) => (
                            <Cell
                              key={entry.key}
                              fill={entry.color}
                              stroke={entry.key === activeStatusFilter ? '#1E293B' : 'transparent'}
                              strokeWidth={entry.key === activeStatusFilter ? 2 : 0}
                              opacity={activeStatusFilter && activeStatusFilter !== entry.key ? 0.45 : 1}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* CHART UTAMA 2: Kepadatan Konten per Minggu */}
              <Card className="shadow-xs border-slate-200/80 dark:border-slate-800 flex flex-col justify-between bg-white dark:bg-slate-900">
                <CardHeader className="pb-2.5 border-b bg-surface-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-ink">
                        Kepadatan Konten per Minggu
                      </CardTitle>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        Jumlah rencana konten berdasarkan minggu publikasi
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 rounded px-2 py-0.5">
                      Minggu 1 – 5
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-2 px-3">
                  <div className="h-[230px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyData}
                        margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip
                          cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                          formatter={(val: any) => [`${val} Rencana Konten`, 'Jumlah']}
                          contentStyle={{
                            borderRadius: '8px',
                            fontSize: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                        <Bar
                          dataKey="count"
                          fill="#0284C7"
                          radius={[4, 4, 0, 0]}
                          barSize={32}
                        >
                          {weeklyData.map((entry, index) => (
                            <Cell
                              key={`week-${index}`}
                              fill={entry.count > 0 ? '#0284C7' : '#CBD5E1'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 2. Metrik Operasional Tambahan (7 Mini Cards) */}
            <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status &amp; Operasional Tambahan
                </span>
                <span className="text-[11px] text-slate-400">
                  Klik item untuk memfilter tabel
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {operationalMetrics.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.onClick}
                      className={`flex flex-col justify-between p-3 rounded-lg border text-left transition-all ${
                        item.active
                          ? 'border-primary bg-white shadow-xs ring-2 ring-primary/20 dark:bg-slate-800'
                          : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <div className={`p-1 rounded-md ${item.color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {item.count}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                        {item.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Analitik Tambahan (Pilar & Platform) */}
            <div className="border-t border-slate-200/80 dark:border-slate-800 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Analitik Tambahan
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kolom A: Distribusi Content Pillar */}
                <Card className="p-3.5 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                        Distribusi Content Pillar
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Pilar komunikasi Humas PLN UID Jawa Barat
                      </p>
                    </div>
                    {activePillarFilter && (
                      <button
                        type="button"
                        onClick={() => onFilterPillar('')}
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        Reset Pilar ✕
                      </button>
                    )}
                  </div>

                  {pillarData.length === 0 || pillarData.every((p) => p.count === 0) ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Belum ada data pilar konten
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {displayedPillars.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onFilterPillar(p.id === activePillarFilter ? '' : p.id)}
                          className={`w-full text-left p-1.5 rounded-md transition-all ${
                            activePillarFilter === p.id
                              ? 'bg-indigo-50/80 ring-1 ring-indigo-400 dark:bg-indigo-950/40'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700 dark:text-slate-200 truncate pr-2">
                              {p.name}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white shrink-0">
                              {p.count} <span className="text-[10px] text-slate-400 font-normal">({p.percentage}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(4, p.percentage)}%` }}
                            />
                          </div>
                        </button>
                      ))}

                      {pillarData.length > 5 && (
                        <div className="pt-1 text-center">
                          <button
                            type="button"
                            onClick={() => setShowAllPillars((prev) => !prev)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            {showAllPillars
                              ? 'Sembunyikan'
                              : `Lihat Semua Pilar (${pillarData.length})`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* Kolom B: Distribusi Target Platform */}
                <Card className="p-3.5 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Share2 className="h-3.5 w-3.5 text-slate-500" />
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                          Distribusi Target Platform
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Multi-platform: 1 konten dapat ditayangkan di &gt;1 platform
                      </p>
                    </div>
                    {activePlatformFilter && (
                      <button
                        type="button"
                        onClick={() => onFilterPlatform('')}
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        Reset Platform ✕
                      </button>
                    )}
                  </div>

                  {platformData.length === 0 || platformData.every((p) => p.count === 0) ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Belum ada data target platform
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {platformData.map((plat) => (
                        <button
                          key={plat.id}
                          type="button"
                          onClick={() => onFilterPlatform(plat.id === activePlatformFilter ? '' : plat.id)}
                          className={`w-full text-left p-1.5 rounded-md transition-all ${
                            activePlatformFilter === plat.id
                              ? 'bg-slate-100 ring-1 ring-slate-400 dark:bg-slate-800'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: plat.color }}
                              />
                              <span className="font-medium text-slate-700 dark:text-slate-200">
                                {plat.name}
                              </span>
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {plat.count} <span className="text-[10px] text-slate-400 font-normal">({plat.percentage}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                backgroundColor: plat.color,
                                width: `${Math.max(4, plat.percentage)}%`,
                              }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
