'use client'

import {
  CircleDashed,
  CalendarClock,
  Loader,
  ClipboardList,
  RotateCcw,
  CheckCircle2,
  Send,
  Globe,
  CalendarOff,
  XCircle,
  Clock3,
  Ban,
  type LucideIcon,
} from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { CONTENT_STATUS_LABELS, PUBLICATION_STATUS_LABELS } from '@/constants'
import type { ContentStatus, PublicationStatus } from '@/types'

type Variant = NonNullable<BadgeProps['variant']>

const CONTENT_MAP: Record<
  ContentStatus,
  { variant: Variant; icon: LucideIcon; label: string }
> = {
  DRAFT: { variant: 'secondary', icon: CircleDashed, label: CONTENT_STATUS_LABELS.DRAFT },
  IN_PROGRESS: { variant: 'warning', icon: Loader, label: CONTENT_STATUS_LABELS.IN_PROGRESS },
  PENDING_REVIEW: { variant: 'warning', icon: ClipboardList, label: CONTENT_STATUS_LABELS.PENDING_REVIEW },
  REVISION_REQUIRED: { variant: 'error', icon: RotateCcw, label: CONTENT_STATUS_LABELS.REVISION_REQUIRED },
  APPROVED: { variant: 'success', icon: CheckCircle2, label: CONTENT_STATUS_LABELS.APPROVED },
  READY_TO_PUBLISH: { variant: 'info', icon: Send, label: CONTENT_STATUS_LABELS.READY_TO_PUBLISH },
  PUBLISHED: { variant: 'success', icon: Globe, label: CONTENT_STATUS_LABELS.PUBLISHED },
  RESCHEDULED: { variant: 'warning', icon: CalendarOff, label: CONTENT_STATUS_LABELS.RESCHEDULED },
  NOT_REALIZED: { variant: 'default', icon: XCircle, label: CONTENT_STATUS_LABELS.NOT_REALIZED },
}

const PUB_MAP: Record<PublicationStatus, { variant: Variant; icon: LucideIcon; label: string }> = {
  PLANNED: { variant: 'secondary', icon: Clock3, label: PUBLICATION_STATUS_LABELS.PLANNED },
  PUBLISHED: { variant: 'success', icon: Globe, label: PUBLICATION_STATUS_LABELS.PUBLISHED },
  DELAYED: { variant: 'warning', icon: CalendarClock, label: PUBLICATION_STATUS_LABELS.DELAYED },
  CANCELLED: { variant: 'default', icon: Ban, label: PUBLICATION_STATUS_LABELS.CANCELLED },
  DELAY: { variant: 'warning', icon: CalendarClock, label: PUBLICATION_STATUS_LABELS.DELAYED },
  CANCEL: { variant: 'default', icon: Ban, label: PUBLICATION_STATUS_LABELS.CANCELLED },
}

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: ContentStatus | PublicationStatus
  kind?: 'content' | 'publication'
}

export function StatusBadge({ status, kind = 'content', className, ...props }: StatusBadgeProps) {
  const def =
    kind === 'publication'
      ? PUB_MAP[status as PublicationStatus]
      : CONTENT_MAP[status as ContentStatus]

  if (!def) {
    return (
      <Badge variant="secondary" className={className} {...props}>
        {String(status)}
      </Badge>
    )
  }

  const Icon = def.icon

  return (
    <Badge variant={def.variant} className={className} {...props}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {def.label}
    </Badge>
  )
}
