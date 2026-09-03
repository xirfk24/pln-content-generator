'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from '@/compat/next'
import ContentPlanningList from '@/pages/_components/content-planning-list'

export default function ContentPlanningPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Content Planning</h1>
          <p className="mt-1 text-sm text-ink-secondary">Manage your content plans</p>
        </div>
        <Link href="/content/planning/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            New Content
          </Button>
        </Link>
      </div>
      <ContentPlanningList />
    </div>
  )
}
