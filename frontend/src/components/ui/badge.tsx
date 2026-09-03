import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-surface-muted text-ink',
        secondary: 'border-border bg-surface-muted text-ink-secondary',
        outline: 'border-border-strong text-ink',
        success: 'border-success-border bg-success-soft text-success',
        warning: 'border-warning-border bg-warning-soft text-warning',
        error: 'border-danger-border bg-danger-soft text-danger',
        info: 'border-info-border bg-info-soft text-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
