import type { UserRole, ContentStatus, ApprovalAction } from '@/types'

/**
 * Alur transisi status yang valid
 */
export const STATUS_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ['PENDING_REVIEW', 'NOT_REALIZED'],
  PENDING_REVIEW: ['REVISION_REQUIRED', 'APPROVED', 'READY_TO_PUBLISH', 'REJECTED'],
  APPROVED: ['PRODUCTION', 'READY_TO_PUBLISH', 'REJECTED'],
  PRODUCTION: ['PENDING_PRODUCTION_REVIEW', 'RESCHEDULED', 'NOT_REALIZED', 'REJECTED'],
  PENDING_PRODUCTION_REVIEW: ['READY_TO_PUBLISH', 'PRODUCTION', 'REVISION_REQUIRED', 'REJECTED'],
  REVISION_REQUIRED: ['PENDING_REVIEW', 'PENDING_PRODUCTION_REVIEW', 'PRODUCTION', 'NOT_REALIZED'],
  READY_TO_PUBLISH: ['PUBLISHED', 'PRODUCTION', 'REVISION_REQUIRED', 'REJECTED'],
  PUBLISHED: [],
  REJECTED: [],
  RESCHEDULED: ['DRAFT', 'PRODUCTION', 'NOT_REALIZED'],
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
    requiresProductionLink?: boolean
  }
> = {
  SUBMITTED: {
    label: 'Ajukan Konsep',
    allowedRoles: ['ADMIN', 'STAFF'],
    allowedFromStatuses: ['DRAFT', 'REVISION_REQUIRED'],
    toStatus: 'PENDING_REVIEW',
    requiresComment: false,
  },
  RESUBMITTED: {
    label: 'Ajukan Ulang Konsep',
    allowedRoles: ['ADMIN', 'STAFF'],
    allowedFromStatuses: ['REVISION_REQUIRED', 'DRAFT'],
    toStatus: 'PENDING_REVIEW',
    requiresComment: false,
  },
  APPROVED: {
    label: 'Setujui Konsep',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['PENDING_REVIEW'],
    toStatus: 'APPROVED',
    requiresComment: false,
  },
  CONCEPT_REVISION_REQUESTED: {
    label: 'Minta Revisi Konsep',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['PENDING_REVIEW'],
    toStatus: 'REVISION_REQUIRED',
    requiresComment: true,
  },
  START_PRODUCTION: {
    label: 'Mulai Produksi Konten',
    allowedRoles: ['ADMIN', 'STAFF'],
    allowedFromStatuses: ['APPROVED'],
    toStatus: 'PRODUCTION',
    requiresComment: false,
  },
  PRODUCTION_SUBMITTED: {
    label: 'Setor Hasil Produksi',
    allowedRoles: ['ADMIN', 'STAFF'],
    allowedFromStatuses: ['PRODUCTION', 'REVISION_REQUIRED'],
    toStatus: 'PENDING_PRODUCTION_REVIEW',
    requiresComment: false,
    requiresProductionLink: true,
  },
  PRODUCTION_APPROVED: {
    label: 'Setujui Produksi (Siap Publikasi)',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['PENDING_PRODUCTION_REVIEW'],
    toStatus: 'READY_TO_PUBLISH',
    requiresComment: false,
  },
  PRODUCTION_REVISION_REQUESTED: {
    label: 'Minta Revisi Hasil Produksi',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['PENDING_PRODUCTION_REVIEW'],
    toStatus: 'REVISION_REQUIRED',
    requiresComment: true,
  },
  SHORTCUT_READY: {
    label: 'Siap Publikasi',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['PENDING_REVIEW', 'APPROVED'],
    toStatus: 'READY_TO_PUBLISH',
    requiresComment: false,
  },
  MARK_PUBLISHED: {
    label: 'Tandai Dipublikasikan',
    allowedRoles: ['ADMIN', 'STAFF'],
    allowedFromStatuses: ['READY_TO_PUBLISH'],
    toStatus: 'PUBLISHED',
    requiresComment: false,
  },
  REVISION_FROM_READY: {
    label: 'Minta Revisi',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['READY_TO_PUBLISH'],
    toStatus: 'REVISION_REQUIRED',
    requiresComment: true,
  },
  REJECTED: {
    label: 'Tolak Konten',
    allowedRoles: ['ADMIN'],
    allowedFromStatuses: ['PENDING_REVIEW', 'APPROVED', 'PRODUCTION', 'PENDING_PRODUCTION_REVIEW', 'READY_TO_PUBLISH', 'REVISION_REQUIRED'],
    toStatus: 'REJECTED',
    requiresComment: true,
  },
  // Legacy actions (fallback)
  START_PROGRESS: { label: 'Mulai Kerjakan', allowedRoles: [], allowedFromStatuses: [], toStatus: 'PRODUCTION', requiresComment: false },
  REVISION_REQUESTED: { label: 'Minta Revisi', allowedRoles: [], allowedFromStatuses: [], toStatus: 'REVISION_REQUIRED', requiresComment: true },
  FINAL_APPROVED: { label: 'Setujui Siap Publikasi', allowedRoles: [], allowedFromStatuses: [], toStatus: 'READY_TO_PUBLISH', requiresComment: false },
  REVIEWED: { label: 'Telah Ditinjau', allowedRoles: [], allowedFromStatuses: [], toStatus: 'PENDING_REVIEW', requiresComment: false },
  REVIEW_APPROVED: { label: 'Setujui Tinjauan', allowedRoles: [], allowedFromStatuses: [], toStatus: 'APPROVED', requiresComment: false },
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
  ADMIN: ['PENDING_REVIEW', 'PENDING_PRODUCTION_REVIEW'],
  STAFF: [],
}

export const ACTION_LABELS: Record<ApprovalAction, string> = {
  SUBMITTED: 'Diajukan Konsep',
  APPROVED: 'Konsep Disetujui',
  CONCEPT_REVISION_REQUESTED: 'Revisi Konsep Diminta',
  START_PRODUCTION: 'Mulai Produksi',
  PRODUCTION_SUBMITTED: 'Hasil Produksi Disetor',
  PRODUCTION_APPROVED: 'Produksi Disetujui',
  PRODUCTION_REVISION_REQUESTED: 'Revisi Produksi Diminta',
  SHORTCUT_READY: 'Langsung Siap Publikasi',
  MARK_PUBLISHED: 'Dipublikasikan',
  REVISION_FROM_READY: 'Revisi dari Siap Tayang',
  REJECTED: 'Ditolak',
  // Legacy labels
  START_PROGRESS: 'Mulai Dikerjakan',
  REVIEWED: 'Ditinjau',
  REVISION_REQUESTED: 'Diminta Revisi',
  REVIEW_APPROVED: 'Tinjauan Disetujui',
  FINAL_APPROVED: 'Disetujui Final',
  RESUBMITTED: 'Diajukan Ulang',
}
