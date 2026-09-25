'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from '@/compat/next'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Calendar, Upload, Info } from 'lucide-react'
import Link from '@/compat/next'
import ContentPlanningList from '@/pages/_components/content-planning-list'
import ContentCalendarPage from '@/pages/content-calendar'
import ContentImportPage from '@/pages/content-import'
import { Card } from '@/components/ui/card'

export default function ContentPlanningPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-ink-muted">Memuat modul perencanaan...</div>}>
      <ContentPlanningTabs />
    </Suspense>
  )
}

function ContentPlanningTabs() {
  const [searchParams] = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get('tab') || 'plan'
  const [activeTab, setActiveTab] = useState<'plan' | 'calendar' | 'import'>(
    initialTab === 'calendar' ? 'calendar' : initialTab === 'import' ? 'import' : 'plan'
  )

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'calendar' || tabParam === 'import' || tabParam === 'plan') {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const setTab = (tab: 'plan' | 'calendar' | 'import') => {
    setActiveTab(tab)
    const url = tab === 'plan' ? '/content/planning' : `/content/planning?tab=${tab}`
    router.replace(url)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-105px)] min-h-[580px] gap-2.5 overflow-hidden">
      {/* Banner Penjelasan Modul Compact */}
      <div className="rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 py-2.5 px-3.5 shadow-2xs dark:border-blue-900/50 dark:from-blue-950/30 dark:to-indigo-950/20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1A3A6B] text-white shadow-2xs">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-[#1A3A6B] dark:text-blue-300">
              Rencana Konten
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
              Modul untuk menyusun, mengelola, mengajukan, dan memantau proses pengelolaan konten sebelum dipublikasikan Bagian Komunikasi PLN UID Jawa Barat.
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar: Tabs & Buat Rencana Konten */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 shrink-0">
        {/* Tab Navigation */}
        <div className="inline-flex rounded-lg bg-surface-muted p-1 text-ink-secondary border border-border">
          <button
            type="button"
            onClick={() => setTab('calendar')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeTab === 'calendar'
                ? 'bg-white text-primary shadow-2xs dark:bg-slate-800 dark:text-white font-bold'
                : 'hover:text-ink text-ink-secondary'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Kalender
          </button>
          <button
            type="button"
            onClick={() => setTab('plan')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeTab === 'plan'
                ? 'bg-white text-primary shadow-2xs dark:bg-slate-800 dark:text-white font-bold'
                : 'hover:text-ink text-ink-secondary'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Daftar Rencana
          </button>
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all ${
              activeTab === 'import'
                ? 'bg-white text-primary shadow-2xs dark:bg-slate-800 dark:text-white font-bold'
                : 'hover:text-ink text-ink-secondary'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Import Konten
          </button>
        </div>

        {/* Tombol Buat Konten */}
        <Link href="/content/planning/new">
          <Button size="sm" className="h-8 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white shadow-2xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Buat Rencana Konten Baru
          </Button>
        </Link>
      </div>

      {/* Konten Berdasarkan Tab Aktif */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'plan' && <div className="overflow-y-auto flex-1"><ContentPlanningList /></div>}
        {activeTab === 'calendar' && <ContentCalendarPage />}
        {activeTab === 'import' && <div className="overflow-y-auto flex-1"><ContentImportPage /></div>}
      </div>
    </div>
  )
}
