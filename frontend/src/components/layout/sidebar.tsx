'use client'

import { apiFetch } from '@/lib/api'
import * as React from 'react'
import Link from '@/compat/next'
import { usePathname } from '@/compat/next'
import {
  LayoutDashboard,
  CalendarRange,
  FileText,
  CheckSquare,
  Send,
  ShieldCheck,
  BarChart3,
  FileBarChart,
  Settings,
  Users,
  ChevronLeft,
  Menu,
  X,
  Download,
  BookmarkCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PLNLogo } from '@/components/ui/pln-logo'
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
    name: 'Perencanaan Konten',
    children: [
      { name: 'Rencana Konten', href: '/content/planning', icon: FileText },
      { name: 'Bank Konten', href: '/content/tabungan', icon: BookmarkCheck },
    ],
  },
  {
    name: 'Alur Kerja',
    children: [
      { name: 'Tugas Saya', href: '/workflow/tasks', icon: CheckSquare, roles: ['ADMIN', 'STAFF'] },
      { name: 'Persetujuan Konten', href: '/workflow/approval', icon: ShieldCheck, roles: ['ADMIN'] },
    ],
  },
  {
    name: 'Publikasi',
    children: [
      { name: 'Antrean Publikasi', href: '/publishing', icon: Send },
    ],
  },
  {
    name: 'Analisis & Laporan',
    children: [
      { name: 'Ringkasan Analisis', href: '/analytics', icon: BarChart3 },
      { name: 'Performa Konten', href: '/analytics/performance', icon: BarChart3 },
      { name: 'Rekap Konten', href: '/recap', icon: CalendarRange },
      { name: 'Laporan Berkala', href: '/reports', icon: FileBarChart },
    ],
  },
  {
    name: 'Administrasi',
    roles: ['ADMIN'],
    children: [
      { name: 'Kelola Pengguna', href: '/admin/users', icon: Users },
      { name: 'Periode Perencanaan', href: '/admin/periods', icon: CalendarRange },
          { name: 'Pilar Konten', href: '/admin/pillars', icon: Settings },
          { name: 'Topik Konten', href: '/admin/topics', icon: FileText },
          { name: 'Platform Media', href: '/admin/platforms', icon: Settings },
    ],
  },
]

function filterByRole<T extends { roles?: UserRole[] }>(items: T[], role: UserRole | null): T[] {
  if (!role) return []
  return items.filter((item) => !item.roles || item.roles.includes(role))
}

const sidebarBg = 'bg-[#1A3A6B]'
const sidebarText = 'text-white/70'
const sidebarGroupLabel = 'text-white/40'
const sidebarHover = 'hover:bg-white/10'
const sidebarActive = 'bg-white/15 font-semibold text-white'
const sidebarActiveIcon = 'text-white'
const sidebarBorder = 'border-white/10'

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
    apiFetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user?.profile?.role && setRole(data.user.profile.role))
      .catch(() => {})
  }, [])

  const items = filterByRole(navigation, role)

  const content = (labelId?: string) => (
    <>
      {/* Logo / Brand area */}
      <div className={cn('flex h-16 items-center justify-between border-b px-4', sidebarBorder)}>
        {!collapsed && (
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            onClick={onMobileClose}
          >
            <PLNLogo showText={false} className="h-8 w-8 shrink-0 rounded-md shadow-sm" />
            <div className="flex flex-col">
              <span className="font-semibold text-white leading-tight">Content Manager</span>
              <span className="text-[10px] text-white/60">UID Jawa Barat</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <PLNLogo showText={false} className="h-8 w-8 shrink-0 rounded-md shadow-sm mx-auto" />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          className={cn('hidden lg:inline-flex text-white/70 hover:bg-white/10 hover:text-white', !collapsed && 'ml-auto')}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileClose}
          aria-label="Tutup menu"
          className="ml-auto text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-2 pb-4" aria-label={labelId}>
        {items.map((item) => {
          if ('children' in item) {
            const children = filterByRole(item.children, role)
            if (children.length === 0) return null
            return (
              <div key={item.name}>
                {!collapsed && (
                  <p className={cn('mb-1 px-3 text-micro font-semibold uppercase tracking-wider', sidebarGroupLabel)}>
                    {item.name}
                  </p>
                )}
                {children.map((child) => {
                  const isActive = pathname === child.href || (child.href === '/content/planning' && (pathname.startsWith('/content/planning') || pathname === '/content/calendar' || pathname === '/content/import'))
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onMobileClose}
                      aria-current={isActive ? 'page' : undefined}
                      title={collapsed ? child.name : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        isActive ? sidebarActive : cn(sidebarText, sidebarHover, 'font-medium')
                      )}
                    >
                      <child.icon
                        className={cn('h-4 w-4 flex-shrink-0', isActive ? sidebarActiveIcon : 'text-white/60')}
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
                isActive ? sidebarActive : cn(sidebarText, sidebarHover, 'font-medium')
              )}
            >
              <item.icon
                className={cn('h-4 w-4 flex-shrink-0', isActive ? sidebarActiveIcon : 'text-white/60')}
                aria-hidden="true"
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className={cn('border-t p-3', sidebarBorder)}>
        {!collapsed && (
          <p className="text-center text-micro text-white/40">&copy; 2026 Humas PLN UID Jabar</p>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 hidden h-screen border-r transition-all duration-300 lg:flex lg:flex-col',
          sidebarBg,
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {content('Navigasi utama')}
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
            className={cn('fixed left-0 top-0 flex h-screen w-60 flex-col border-r shadow-lg', sidebarBg)}
            role="dialog"
            aria-modal="true"
            aria-label="Menu sidebar"
          >
            {content('Navigasi mobile')}
          </aside>
        </div>
      )}
    </>
  )
}
