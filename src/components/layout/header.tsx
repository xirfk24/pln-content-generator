'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, LogOut, Menu, User } from 'lucide-react'
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

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = React.useState<CurrentUser | null>(null)

  const pageTitle = usePageTitle(pathname)

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user && setUser(data.user))
      .catch(() => {})
  }, [])

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
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
        sidebarCollapsed ? 'left-16' : 'left-64'
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
        <h2 className="truncate text-card-title font-semibold text-ink sm:text-base">
          {pageTitle}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" title="Notifications" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

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
