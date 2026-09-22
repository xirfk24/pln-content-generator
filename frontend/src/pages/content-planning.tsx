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
    <div className="space-y-6">
      {/* Banner Penjelasan Modul Konsisten */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 p-4.5 shadow-xs dark:border-blue-900/50 dark:from-blue-950/30 dark:to-indigo-950/20">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1A3A6B] text-white shadow-xs">
            <FileText className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[#1A3A6B] dark:text-blue-300">
              Rencana Konten
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Modul ini digunakan untuk menyusun, mengelola, mengajukan, dan memantau proses pengelolaan konten sebelum dipublikasikan oleh Bagian Komunikasi PLN UID Jawa Barat.
            </p>
          </div>
        </div>
      </div>

      {/* Header Aksi & Tab Navigasi */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        {/* Tab Buttons */}
        <div className="inline-flex rounded-lg bg-surface-muted p-1 text-ink-secondary border border-border">
          <button
            type="button"
            onClick={() => setTab('plan')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all ${
              activeTab === 'plan'
                ? 'bg-white text-primary shadow-xs dark:bg-slate-800 dark:text-white font-semibold'
                : 'hover:text-ink text-ink-secondary'
            }`}
          >
            <FileText className="h-4 w-4" />
            Rencana Konten
          </button>
          <button
            type="button"
            onClick={() => setTab('calendar')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all ${
              activeTab === 'calendar'
                ? 'bg-white text-primary shadow-xs dark:bg-slate-800 dark:text-white font-semibold'
                : 'hover:text-ink text-ink-secondary'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Kalender
          </button>
          <button
            type="button"
            onClick={() => setTab('import')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all ${
              activeTab === 'import'
                ? 'bg-white text-primary shadow-xs dark:bg-slate-800 dark:text-white font-semibold'
                : 'hover:text-ink text-ink-secondary'
            }`}
          >
            <Upload className="h-4 w-4" />
            Import Data
          </button>
        </div>

        {/* Tombol Buat Konten */}
        <Link href="/content/planning/new">
          <Button className="w-full sm:w-auto shadow-xs">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Buat Rencana Konten
          </Button>
        </Link>
      </div>

      {/* Konten Berdasarkan Tab Aktif */}
      <div className="pt-1">
        {activeTab === 'plan' && <ContentPlanningList />}
        {activeTab === 'calendar' && <ContentCalendarPage />}
        {activeTab === 'import' && <ContentImportPage />}
      </div>
    </div>
  )
}
