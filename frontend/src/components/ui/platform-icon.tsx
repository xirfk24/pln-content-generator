import React from 'react'
import {
  Globe,
  Share2,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PlatformVisualConfig {
  name: string
  icon: React.ComponentType<{ className?: string }>
  badgeBg: string
  textColor: string
  activeRing: string
  description: string
}

// Custom crisp SVG icons for social media brands
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.59-1v6.73c-.02 3.65-2.2 6.94-5.55 8.16-3.35 1.22-7.14.33-9.59-2.22-2.45-2.55-2.88-6.47-1.07-9.5 1.81-3.03 5.4-4.63 8.87-3.95v4.06c-1.78-.34-3.66.19-4.94 1.4-1.28 1.21-1.68 3.08-1.03 4.74.65 1.66 2.27 2.75 4.05 2.73 1.78-.02 3.37-1.15 3.97-2.83.21-.59.3-1.22.3-1.85V.02z" />
    </svg>
  )
}

export function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33zM9.75 15.02V8.53l5.75 3.24z" />
    </svg>
  )
}

export function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

export function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export function getPlatformVisual(platformName?: string | null): PlatformVisualConfig {
  const norm = (platformName || '').toLowerCase().trim()

  if (norm.includes('instagram')) {
    return {
      name: 'Instagram',
      icon: InstagramIcon,
      badgeBg: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]',
      textColor: 'text-white',
      activeRing: 'ring-2 ring-pink-500 ring-offset-2',
      description: 'Reels, Story, Feeds & Carousel',
    }
  }

  if (norm.includes('facebook')) {
    return {
      name: 'Facebook',
      icon: FacebookIcon,
      badgeBg: 'bg-[#1877F2]',
      textColor: 'text-white',
      activeRing: 'ring-2 ring-blue-600 ring-offset-2',
      description: 'Fanpage & Facebook Reels',
    }
  }

  if (norm.includes('tiktok')) {
    return {
      name: 'TikTok',
      icon: TikTokIcon,
      badgeBg: 'bg-[#010101]',
      textColor: 'text-white',
      activeRing: 'ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2',
      description: 'Short Video & Sound Trends',
    }
  }

  if (norm.includes('youtube')) {
    return {
      name: 'YouTube',
      icon: YouTubeIcon,
      badgeBg: 'bg-[#FF0000]',
      textColor: 'text-white',
      activeRing: 'ring-2 ring-red-600 ring-offset-2',
      description: 'Shorts & Long Video Content',
    }
  }

  if (norm.includes('linkedin')) {
    return {
      name: 'LinkedIn',
      icon: LinkedInIcon,
      badgeBg: 'bg-[#0A66C2]',
      textColor: 'text-white',
      activeRing: 'ring-2 ring-blue-700 ring-offset-2',
      description: 'Professional & Corporate Articles',
    }
  }

  if (norm.includes('website') || norm.includes('web') || norm.includes('portal')) {
    return {
      name: 'Website',
      icon: Globe,
      badgeBg: 'bg-[#0284C7]',
      textColor: 'text-white',
      activeRing: 'ring-2 ring-sky-600 ring-offset-2',
      description: 'Portal Berita & Siaran Pers Resmi',
    }
  }

  if (norm.includes('twitter') || norm.includes('x')) {
    return {
      name: 'Twitter/X',
      icon: XIcon,
      badgeBg: 'bg-[#0F1419]',
      textColor: 'text-white',
      activeRing: 'ring-2 ring-slate-900 dark:ring-slate-100 ring-offset-2',
      description: 'Utas, Berita Kilat & Tanggapan',
    }
  }

  return {
    name: platformName || 'Umum',
    icon: Share2,
    badgeBg: 'bg-slate-700',
    textColor: 'text-white',
    activeRing: 'ring-2 ring-slate-600 ring-offset-2',
    description: 'Kanal Publikasi Lainnya',
  }
}

/** 1. Platform Icon Badge (Pill with icon + label) */
export function PlatformBadge({
  name,
  platform,
  className,
  size = 'md',
}: {
  name?: string
  platform?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const targetName = platform || name || 'Umum'
  const visual = getPlatformVisual(targetName)
  const Icon = visual.icon

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size]

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  }[size]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium shadow-2xs transition-transform',
        visual.badgeBg,
        visual.textColor,
        sizeClasses,
        className
      )}
      title={visual.name}
    >
      <Icon className={cn(iconSizes, 'shrink-0')} />
      <span>{visual.name}</span>
    </span>
  )
}

/** 2. Compact Icon-Only Badge with Tooltip */
export function PlatformIconOnly({
  name,
  platform,
  className,
  size = 'md',
}: {
  name?: string
  platform?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const targetName = platform || name || 'Umum'
  const visual = getPlatformVisual(targetName)
  const Icon = visual.icon

  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7',
  }[size]

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  }[size]

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full shadow-2xs transition-transform hover:scale-110',
        visual.badgeBg,
        visual.textColor,
        sizeClasses,
        className
      )}
      title={visual.name}
      aria-label={visual.name}
    >
      <Icon className={cn(iconSizes, 'shrink-0')} />
    </span>
  )
}

/** 3. Platform Cluster (Row of icon badges for lists & cards) */
export function PlatformCluster({
  platforms,
  masterPlatforms,
  maxDisplay,
  className,
  size = 'sm',
  showText = false,
}: {
  platforms: string[]
  masterPlatforms?: Array<{ id: string; name: string }>
  maxDisplay?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}) {
  if (!platforms || platforms.length === 0) {
    return <span className="text-xs text-ink-muted">-</span>
  }

  // Resolve IDs to names if masterPlatforms is provided
  const resolvedNames: string[] = []
  platforms.forEach((p) => {
    if (masterPlatforms && masterPlatforms.length > 0) {
      const match = masterPlatforms.find((mp) => mp.id === p || mp.name.toLowerCase() === p.toLowerCase())
      if (match) {
        if (!resolvedNames.includes(match.name)) resolvedNames.push(match.name)
        return
      }
    }
    if (!resolvedNames.includes(p)) resolvedNames.push(p)
  })

  const displayList = maxDisplay ? resolvedNames.slice(0, maxDisplay) : resolvedNames
  const remainingCount = maxDisplay && resolvedNames.length > maxDisplay ? resolvedNames.length - maxDisplay : 0
  const remainingNames = remainingCount > 0 ? resolvedNames.slice(maxDisplay).join(', ') : ''

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {displayList.map((p) =>
        showText ? (
          <PlatformBadge key={p} name={p} size={size} />
        ) : (
          <PlatformIconOnly key={p} name={p} size={size} />
        )
      )}
      {remainingCount > 0 && (
        <span
          className="inline-flex items-center rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-secondary border border-border/60 hover:text-ink cursor-help"
          title={`Platform lainnya: ${remainingNames}`}
        >
          +{remainingCount} platform
        </span>
      )}
    </div>
  )
}

/** 4. Interactive Multi-Select Platform Selector for Form */
export interface PlatformOption {
  id: string
  name: string
  icon?: string | null
}

export function PlatformSelector({
  platforms,
  selectedIds,
  onChange,
  disabled = false,
}: {
  platforms: PlatformOption[]
  selectedIds: string[]
  onChange: (newIds: string[]) => void
  disabled?: boolean
}) {
  const toggle = (id: string) => {
    if (disabled) return
    const exists = selectedIds.includes(id)
    if (exists) {
      onChange(selectedIds.filter((p) => p !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {platforms.map((p) => {
          const isSelected = selectedIds.includes(p.id)
          const visual = getPlatformVisual(p.name)
          const Icon = visual.icon

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              disabled={disabled}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all',
                'focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2',
                isSelected
                  ? 'border-primary/40 bg-primary-soft/30 shadow-xs ring-1 ring-primary/50'
                  : 'border-border bg-surface hover:border-ink-muted/30 hover:bg-surface-muted/50',
                disabled && 'cursor-not-allowed opacity-60'
              )}
            >
              {/* Platform Brand Icon */}
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-xs transition-transform group-hover:scale-105',
                  visual.badgeBg,
                  visual.textColor
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
              </div>

              {/* Text info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink">
                  {p.name}
                </p>
                <p className="truncate text-[10px] text-ink-muted">
                  {isSelected ? 'Dipilih' : 'Klik untuk pilih'}
                </p>
              </div>

              {/* Active checkmark badge */}
              {isSelected && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-2xs">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selectedIds.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⚠️ Pilih minimal satu platform target publikasi konten ini.
        </p>
      )}
    </div>
  )
}
