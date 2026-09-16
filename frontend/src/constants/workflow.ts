import type { UserRole, ContentStatus, ApprovalAction } from '@/types'

/**
 * Alur transisi status yang valid
 */
export const STATUS_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ['IN_PROGRESS', 'PENDING_REVIEW', 'NOT_REALIZED'],
  IN_PROGRESS: ['PENDING_REVIEW', 'RESCHEDULED', 'NOT_REALIZED'],
  PENDING_REVIEW: ['IN_PROGRESS', 'REVISION_REQUIRED', 'APPROVED'],
  REVISION_REQUIRED: ['IN_PROGRESS', 'PENDING_REVIEW', 'NOT_REALIZED'],
  APPROVED: ['READY_TO_PUBLISH', 'PUBLISHED', 'IN_PROGRESS', 'REVISION_REQUIRED'],
  READY_TO_PUBLISH: ['PUBLISHED', 'IN_PROGRESS', 'REVISION_REQUIRED'],
  PUBLISHED: [],
  RESCHEDULED: ['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'NOT_REALIZED'],
  NOT_REALIZED: [],
}

/**
 * Definisi aksi workflow dalam Bahasa Indonesia
 */
export const WORKFLOW_ACTIONS: Record<
  ApprovalAction,
  {
    label: string
    allowedRoles: UserRole[]
    allowedFromStatuses: ContentStatus[]
    toStatus: ContentStatus
    requiresComment: boolean
  }
> = {
  START_PROGRESS: {
    label: 'Mulai Kerjakan',
    allowedRoles: ['ADMIN', 'STAFF'],
    allowedFromStatuses: ['DRAFT'],
    toStatus: 'IN_PROGRESS',
    requiresComment: false,
  },
  SUBMITTED: {
    label: 'Ajukan untuk Ditinjau',
    allowedRoles: ['ADMIN', 'STAFF'],
    allowedFromStatuses: ['DRAFT', 'IN_PROGRESS'],
    toStatus: 'PENDING_REVIEW',
    requiresComment: false,
  },
  RESUBMITTED: {
    label: 'Ajukan Ulang',
    allowedRoles: ['ADMIN', 'STAFF'],
    allowedFromStatuses: ['REVISION_REQUIRED', 'IN_PROGRESS'],
    toStatus: 'PENDING_REVIEW',
    requiresComment: false,
  },
  APPROVED: {
    label: 'Setujui Konten',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['PENDING_REVIEW'],
    toStatus: 'APPROVED',
    requiresComment: false,
  },
  REVISION_REQUESTED: {
    label: 'Minta Revisi',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['PENDING_REVIEW'],
    toStatus: 'IN_PROGRESS',
    requiresComment: true,
  },
  MARK_PUBLISHED: {
    label: 'Tandai Dipublikasikan',
    allowedRoles: ['ADMIN', 'STAFF'],
    allowedFromStatuses: ['APPROVED', 'READY_TO_PUBLISH'],
    toStatus: 'PUBLISHED',
    requiresComment: false,
  },
  FINAL_APPROVED: {
    label: 'Setujui Siap Publikasi',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['APPROVED'],
    toStatus: 'READY_TO_PUBLISH',
    requiresComment: false,
  },
  REJECTED: {
    label: 'Tolak / Minta Revisi',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['APPROVED', 'READY_TO_PUBLISH'],
    toStatus: 'IN_PROGRESS',
    requiresComment: true,
  },
  // Legacy actions
  REVIEWED: {
    label: 'Telah Ditinjau',
    allowedRoles: [],
    allowedFromStatuses: [],
    toStatus: 'PENDING_REVIEW',
    requiresComment: false,
  },
  REVIEW_APPROVED: {
    label: 'Setujui Tinjauan',
    allowedRoles: [],
    allowedFromStatuses: [],
    toStatus: 'APPROVED',
    requiresComment: false,
  },
}

export function isValidTransition(from: ContentStatus, to: ContentStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

export function canPerformAction(
  action: ApprovalAction,
  role: UserRole,
  fromStatus: ContentStatus
): boolean {
  const def = WORKFLOW_ACTIONS[action]
  if (!def) return false
  return def.allowedRoles.includes(role) && def.allowedFromStatuses.includes(fromStatus)
}

export const APPROVAL_QUEUE_STATUSES: Record<string, ContentStatus[]> = {
  ADMIN: ['PENDING_REVIEW', 'APPROVED'],
  STAFF: [],
}

export const ACTION_LABELS: Record<ApprovalAction, string> = {
  START_PROGRESS: 'Mulai Dikerjakan',
  SUBMITTED: 'Diajukan',
  REVIEWED: 'Ditinjau',
  REVISION_REQUESTED: 'Diminta Revisi',
  REVIEW_APPROVED: 'Tinjauan Disetujui',
  APPROVED: 'Disetujui',
  FINAL_APPROVED: 'Disetujui Final',
  REJECTED: 'Ditolak',
  RESUBMITTED: 'Diajukan Ulang',
  MARK_PUBLISHED: 'Dipublikasikan',
}
