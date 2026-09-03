'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  FileText,
  CheckSquare,
  Send,
  ShieldCheck,
  BarChart3,
  FileBarChart,
  Bot,
  Settings,
  Users,
  ChevronLeft,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/types'

type NavItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
}

type NavGroup = {
  name: string
  roles?: UserRole[]
  children: NavItem[]
}

const navigation: Array<NavItem | (NavGroup & { children: NavItem[] })> = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Planning',
    children: [
      { name: 'Calendar', href: '/content/calendar', icon: Calendar },
      { name: 'Content Plan', href: '/content/planning', icon: FileText },
    ],
  },
  {
    name: 'Workflow',
    children: [
      { name: 'My Tasks', href: '/workflow/tasks', icon: CheckSquare, roles: ['ADMIN', 'STAFF'] },
      { name: 'Review & Approval', href: '/workflow/approval', icon: ShieldCheck, roles: ['ADMIN', 'REVIEWER', 'APPROVER'] },
    ],
  },
  {
    name: 'Publishing',
    children: [
      { name: 'Publishing Queue', href: '/publishing', icon: Send },
    ],
  },
  {
    name: 'Analytics',
    children: [
      { name: 'Overview', href: '/analytics', icon: BarChart3 },
      { name: 'Performance', href: '/analytics/performance', icon: BarChart3 },
      { name: 'AI Insights', href: '/analytics/insights', icon: Bot },
      { name: 'Reports', href: '/reports', icon: FileBarChart },
    ],
  },
  {
    name: 'AI',
    children: [{ name: 'AI Assistant', href: '/ai', icon: Bot }],
  },
  {
    name: 'Administration',
    roles: ['ADMIN'],
    children: [
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Pillars', href: '/admin/pillars', icon: Settings },
      { name: 'Categories', href: '/admin/categories', icon: Settings },
      { name: 'Platforms', href: '/admin/platforms', icon: Settings },
    ],
  },
]

function filterByRole<T extends { roles?: UserRole[] }>(items: T[], role: UserRole | null): T[] {
  if (!role) return []
  return items.filter((item) => !item.roles || item.roles.includes(role))
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [role, setRole] = React.useState<UserRole | null>(null)

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user?.profile?.role && setRole(data.user.profile.role))
      .catch(() => {})
  }, [])

  const items = filterByRole(navigation, role)

  const content = (labelId?: string) => (
    <>
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={onMobileClose}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary shadow-sm">
              <span className="text-xs font-bold text-white">PLN</span>
            </div>
            <span className="font-semibold text-ink">Content Manager</span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary shadow-sm">
            <span className="text-xs font-bold text-white">PLN</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn('hidden lg:inline-flex', !collapsed && 'ml-auto')}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileClose}
          aria-label="Close menu"
          className="ml-auto lg:hidden"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-2 pb-16" aria-label={labelId}>
        {items.map((item) => {
          if ('children' in item) {
            const children = filterByRole(item.children, role)
            if (children.length === 0) return null
            return (
              <div key={item.name}>
                {!collapsed && (
                  <p className="mb-1 px-3 text-micro font-semibold uppercase tracking-wider text-ink-muted">
                    {item.name}
                  </p>
                )}
                {children.map((child) => {
                  const isActive = pathname === child.href
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onMobileClose}
                      aria-current={isActive ? 'page' : undefined}
                      title={collapsed ? child.name : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-primary-soft font-semibold text-primary'
                          : 'font-medium text-ink-secondary hover:bg-surface-muted hover:text-ink'
                      )}
                    >
                      <child.icon
                        className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')}
                        aria-hidden="true"
                      />
                      {!collapsed && <span>{child.name}</span>}
                    </Link>
                  )
                })}
              </div>
            )
          }

          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? item.name : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary-soft font-semibold text-primary'
                  : 'font-medium text-ink-secondary hover:bg-surface-muted hover:text-ink'
              )}
            >
              <item.icon
                className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')}
                aria-hidden="true"
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 hidden h-screen border-r border-border bg-surface transition-all duration-300 lg:block',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {content('Main navigation')}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px]"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside
            className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-surface shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-label="Sidebar menu"
          >
            {content('Mobile navigation')}
          </aside>
        </div>
      )}
    </>
  )
}
