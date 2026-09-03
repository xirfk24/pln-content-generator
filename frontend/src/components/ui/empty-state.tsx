import * as React from 'react'
import Link from '@/compat/next'
import { cn } from '@/lib/utils'
import { Plus, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  actionOnClick?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  className,
}: EmptyStateProps) {
  const action = actionLabel ? (
    <span className="mt-4 inline-flex">
      {actionHref ? (
        <Link
          href={actionHref}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-surface shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {actionLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={actionOnClick}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-surface shadow-sm transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {actionLabel}
        </button>
      )}
    </span>
  ) : null

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
          <Icon className="h-6 w-6 text-ink-muted" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-card-title font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-secondary">{description}</p>
      {action}
    </div>
  )
}
