'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import ContentIdeasList from './_components/content-ideas-list'

export default function ContentIdeasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Content Ideas</h1>
          <p className="mt-1 text-sm text-ink-secondary">Manage your content ideas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/content/ideas/ai">
            <Button variant="outline">
              Generate with AI
            </Button>
          </Link>
          <Link href="/content/ideas/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Idea
            </Button>
          </Link>
        </div>
      </div>
      <ContentIdeasList />
    </div>
  )
}
