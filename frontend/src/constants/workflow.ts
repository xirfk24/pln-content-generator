import type { UserRole, ContentStatus, ApprovalAction } from '@/types'

/**
 * Controlled status transitions.
 * Key: from status. Value: allowed target statuses.
 */
export const STATUS_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ['PLANNED', 'IN_PROGRESS', 'PENDING_REVIEW', 'NOT_REALIZED'],
  PLANNED: ['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'RESCHEDULED', 'NOT_REALIZED'],
  IN_PROGRESS: ['PENDING_REVIEW', 'RESCHEDULED', 'NOT_REALIZED'],
  PENDING_REVIEW: ['REVISION_REQUIRED', 'APPROVED'],
  REVISION_REQUIRED: ['PENDING_REVIEW', 'NOT_REALIZED'],
  APPROVED: ['READY_TO_PUBLISH', 'REVISION_REQUIRED'],
  READY_TO_PUBLISH: ['PUBLISHED', 'REVISION_REQUIRED'],
  PUBLISHED: [],
  RESCHEDULED: ['PLANNED', 'IN_PROGRESS', 'PENDING_REVIEW', 'NOT_REALIZED'],
  NOT_REALIZED: [],
}

/**
 * Workflow actions: who may perform them and what status they produce.
 *
 * Two-tier model:
 * - STAFF (Operator): draft, brief, AI assist, submit, respond to revision
 * - ADMIN (Gatekeeper): approve / reject, master data, dashboard evaluation
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
  SUBMITTED: {
    label: 'Submit for Review',
    allowedRoles: ['ADMIN', 'STAFF'],
    allowedFromStatuses: ['DRAFT', 'PLANNED', 'IN_PROGRESS'],
    toStatus: 'PENDING_REVIEW',
    requiresComment: false,
  },
  RESUBMITTED: {
    label: 'Resubmit for Review',
    allowedRoles: ['ADMIN', 'STAFF'],
    allowedFromStatuses: ['REVISION_REQUIRED'],
    toStatus: 'PENDING_REVIEW',
    requiresComment: false,
  },
  APPROVED: {
    label: 'Approve',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['PENDING_REVIEW'],
    toStatus: 'APPROVED',
    requiresComment: false,
  },
  REVISION_REQUESTED: {
    label: 'Request Revision',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['PENDING_REVIEW'],
    toStatus: 'REVISION_REQUIRED',
    requiresComment: true,
  },
  FINAL_APPROVED: {
    label: 'Final Approval',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['APPROVED'],
    toStatus: 'READY_TO_PUBLISH',
    requiresComment: false,
  },
  REJECTED: {
    label: 'Reject',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['APPROVED', 'READY_TO_PUBLISH'],
    toStatus: 'REVISION_REQUIRED',
    requiresComment: true,
  },
  // Legacy actions — no longer offered, kept so old history rows still typecheck
  REVIEWED: {
    label: 'Mark as Reviewed',
    allowedRoles: [],
    allowedFromStatuses: [],
    toStatus: 'PENDING_REVIEW',
    requiresComment: false,
  },
  REVIEW_APPROVED: {
    label: 'Approve Review',
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

/** Statuses that require ADMIN (gatekeeper) attention. */
export const APPROVAL_QUEUE_STATUSES: Record<string, ContentStatus[]> = {
  ADMIN: ['PENDING_REVIEW', 'APPROVED'],
  STAFF: [],
}

export const ACTION_LABELS: Record<ApprovalAction, string> = {
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
  REVISION_REQUESTED: 'Revision Requested',
  REVIEW_APPROVED: 'Review Approved',
  APPROVED: 'Approved',
  FINAL_APPROVED: 'Final Approved',
  REJECTED: 'Rejected',
  RESUBMITTED: 'Resubmitted',
}
