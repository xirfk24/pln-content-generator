import { UserRole, ContentStatus, PublicationStatus } from '@/types'

export const USER_ROLES: UserRole[] = ['ADMIN', 'STAFF']

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator (Gatekeeper)',
  STAFF: 'Staff / Operator',
}

export const CONTENT_STATUSES: ContentStatus[] = [
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'PENDING_REVIEW',
  'REVISION_REQUIRED',
  'APPROVED',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'RESCHEDULED',
  'NOT_REALIZED',
]

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: 'Draft',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  PENDING_REVIEW: 'Pending Review',
  REVISION_REQUIRED: 'Revision Required',
  APPROVED: 'Approved',
  READY_TO_PUBLISH: 'Ready to Publish',
  PUBLISHED: 'Published',
  RESCHEDULED: 'Rescheduled',
  NOT_REALIZED: 'Not Realized',
}

export const CONTENT_STATUS_COLORS: Record<ContentStatus, string> = {
  DRAFT: 'bg-surface-muted text-ink',
  PLANNED: 'bg-primary-soft text-primary',
  IN_PROGRESS: 'bg-warning-soft text-warning',
  PENDING_REVIEW: 'bg-warning-soft text-warning',
  REVISION_REQUIRED: 'bg-danger-soft text-danger',
  APPROVED: 'bg-success-soft text-success',
  READY_TO_PUBLISH: 'bg-info-soft text-info',
  PUBLISHED: 'bg-success-soft text-success',
  RESCHEDULED: 'bg-warning-soft text-warning',
  NOT_REALIZED: 'bg-surface-muted text-ink-secondary',
}

export const PUBLICATION_STATUSES: PublicationStatus[] = ['PLANNED', 'PUBLISHED', 'DELAYED', 'CANCELLED']

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  PLANNED: 'Planned',
  PUBLISHED: 'Published',
  DELAYED: 'Delayed',
  CANCELLED: 'Cancelled',
}

export const CONTENT_FORMATS = [
  'Vid/Reels/Shorts',
  'Feed/Photo',
  'Carousel',
  'Story',
  'Article',
  'Infographic',
]

export const CONTENT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const

export const ENGAGEMENT_FORMULA =
  'Engagement Rate = (Likes + Comments + Shares + Saves) / Reach × 100'
