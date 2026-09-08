'use client'

import { apiFetch } from '@/lib/api'
import * as React from 'react'
import { useRouter, usePathname } from '@/compat/next'
import { Bell, LogOut, Menu, User, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/constants'
import type { UserRole } from '@/types'

interface HeaderProps {
  onMenuClick: () => void
  sidebarCollapsed: boolean
}

interface CurrentUser {
  id: string
  email: string | null
  profile: {
    full_name: string
    role: string
  } | null
}

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/content/calendar': 'Content Calendar',
  '/content/planning': 'Content Planning',
  '/content/planning/new': 'New Content',
  '/publishing': 'Publishing Tracker',
  '/workflow/tasks': 'My Tasks',
  '/workflow/approval': 'Approval Queue',
  '/analytics': 'Analytics Overview',
  '/analytics/performance': 'Performance Analytics',
  '/analytics/insights': 'AI Insights',
  '/reports': 'Reports',
  '/ai': 'AI Assistant',
  '/admin/users': 'Users',
  '/admin/pillars': 'Pillars',
  '/admin/categories': 'Categories',
  '/admin/platforms': 'Platforms',
}

const ROUTE_SUBTITLES: Record<string, string> = {
  '/dashboard': 'Content activity, workflow overview & performance summary',
  '/content/calendar': 'Monthly content scheduling calendar',
  '/content/planning': 'Manage and track all planned content',
  '/publishing': 'Track publications across platforms',
  '/workflow/tasks': 'Your assigned content tasks',
  '/workflow/approval': 'Review and approve content',
  '/analytics': 'Performance metrics across platforms',
  '/analytics/performance': 'Detailed content performance ranking',
  '/analytics/insights': 'AI-powered performance analysis',
  '/reports': 'Export and filter content reports',
  '/ai': 'AI-powered content tools',
  '/admin/users': 'Manage user accounts and roles',
  '/admin/pillars': 'Manage content pillars',
  '/admin/categories': 'Manage content categories',
  '/admin/platforms': 'Manage publishing platforms',
}

function usePageTitle(pathname: string): string {
  return React.useMemo(() => {
    if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
    if (pathname.startsWith('/content/planning/')) return 'Content Detail'
    if (pathname.startsWith('/content/')) {
      return pathname.endsWith('/edit') ? 'Edit Content' : 'Content Detail'
    }
    return 'Content Management System'
  }, [pathname])
}

function usePageSubtitle(pathname: string): string {
  return React.useMemo(() => {
    if (ROUTE_SUBTITLES[pathname]) return ROUTE_SUBTITLES[pathname]
    if (pathname.startsWith('/content/')) return 'View and manage content details'
    return ''
  }, [pathname])
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = React.useState<CurrentUser | null>(null)

  const pageTitle = usePageTitle(pathname)
  const pageSubtitle = usePageSubtitle(pathname)

  React.useEffect(() => {
    apiFetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user && setUser(data.user))
      .catch(() => {})
  }, [])

  async function handleLogout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // proceed with client-side redirect anyway
    }
    router.push('/login')
    router.refresh()
  }

  const roleLabel = user?.profile?.role
    ? ROLE_LABELS[user.profile.role as UserRole] || user.profile.role
    : ''

  const displayName = user?.profile?.full_name
  const initials = displayName
    ? displayName
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : ''

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur transition-all duration-300 sm:px-6',
        sidebarCollapsed ? 'left-16' : 'left-60'
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h2 className="truncate text-card-title font-semibold text-ink sm:text-lg">
            {pageTitle}
          </h2>
          {pageSubtitle && (
            <p className="hidden truncate text-xs text-ink-muted sm:block">{pageSubtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Date range picker pill — hidden on mobile */}
        <button
          type="button"
          className="hidden items-center gap-2 rounded-md border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-muted md:flex"
          aria-label="Select date range"
        >
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          <span>01 Jun 2025 – 30 Jun 2025</span>
        </button>

        {/* Notifications with badge */}
        <Button variant="ghost" size="icon" title="Notifications" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
          </span>
        </Button>

        {/* User avatar + info */}
        <div className="flex items-center gap-2">
          {initials ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
              {initials}
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft">
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
          )}
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium leading-tight text-ink">
              {displayName || 'Loading...'}
            </p>
            <p className="text-xs leading-tight text-ink-muted">{roleLabel}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          title="Logout"
          className="hidden sm:inline-flex"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Logout
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
          className="sm:hidden"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </header>
  )
}
