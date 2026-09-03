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
  REVIEWED: {
    label: 'Mark as Reviewed',
    allowedRoles: ['ADMIN', 'REVIEWER'],
    allowedFromStatuses: ['PENDING_REVIEW'],
    toStatus: 'PENDING_REVIEW',
    requiresComment: false,
  },
  REVISION_REQUESTED: {
    label: 'Request Revision',
    allowedRoles: ['ADMIN', 'REVIEWER'],
    allowedFromStatuses: ['PENDING_REVIEW'],
    toStatus: 'REVISION_REQUIRED',
    requiresComment: true,
  },
  REVIEW_APPROVED: {
    label: 'Approve Review',
    allowedRoles: ['ADMIN', 'REVIEWER'],
    allowedFromStatuses: ['PENDING_REVIEW'],
    toStatus: 'APPROVED',
    requiresComment: false,
  },
  FINAL_APPROVED: {
    label: 'Final Approval',
    allowedRoles: ['ADMIN', 'APPROVER'],
    allowedFromStatuses: ['APPROVED'],
    toStatus: 'READY_TO_PUBLISH',
    requiresComment: false,
  },
  REJECTED: {
    label: 'Reject',
    allowedRoles: ['ADMIN', 'APPROVER'],
    allowedFromStatuses: ['APPROVED', 'READY_TO_PUBLISH'],
    toStatus: 'REVISION_REQUIRED',
    requiresComment: true,
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

/** Statuses that require reviewer/approver attention, per role. */
export const APPROVAL_QUEUE_STATUSES: Record<string, ContentStatus[]> = {
  REVIEWER: ['PENDING_REVIEW'],
  APPROVER: ['APPROVED'],
  ADMIN: ['PENDING_REVIEW', 'APPROVED'],
}

export const ACTION_LABELS: Record<ApprovalAction, string> = {
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
  REVISION_REQUESTED: 'Revision Requested',
  REVIEW_APPROVED: 'Review Approved',
  FINAL_APPROVED: 'Final Approved',
  REJECTED: 'Rejected',
  RESUBMITTED: 'Resubmitted',
}
