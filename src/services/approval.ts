'use server'

import { createClient } from '@/lib/supabase/server'
import type { ApprovalAction, Content, ContentStatus, UserRole } from '@/types'
import { WORKFLOW_ACTIONS, APPROVAL_QUEUE_STATUSES } from '@/constants/workflow'

export type WorkflowResult =
  | { success: true; content: Content }
  | { success: false; error: string; status: number }

async function getCurrentProfile() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile ?? null
}

export async function performWorkflowAction(
  contentId: string,
  action: ApprovalAction,
  comment?: string
): Promise<WorkflowResult> {
  const supabase = createClient()

  const profile = await getCurrentProfile()
  if (!profile) {
    return { success: false, error: 'Unauthorized', status: 401 }
  }

  const def = WORKFLOW_ACTIONS[action]
  if (!def) {
    return { success: false, error: `Unknown action: ${action}`, status: 400 }
  }

  if (def.requiresComment && (!comment || comment.trim().length === 0)) {
    return { success: false, error: 'Comment is required for this action', status: 400 }
  }

  const role = profile.role as UserRole
  if (!def.allowedRoles.includes(role)) {
    return {
      success: false,
      error: `Role ${role} is not allowed to perform ${def.label}`,
      status: 403,
    }
  }

  const { data: content } = await supabase
    .from('contents')
    .select('*')
    .eq('id', contentId)
    .single()

  if (!content) {
    return { success: false, error: 'Content not found', status: 404 }
  }

  const fromStatus = content.status as ContentStatus
  if (!def.allowedFromStatuses.includes(fromStatus)) {
    return {
      success: false,
      error: `Cannot ${def.label} from status ${fromStatus}`,
      status: 400,
    }
  }

  const toStatus = def.toStatus

  const { data: updated, error: updateError } = await supabase
    .from('contents')
    .update({
      status: toStatus,
      updated_by: profile.id,
    })
    .eq('id', contentId)
    .select('*, pillar:pillars(*), category:categories(*), platform:platforms(*)')
    .single()

  if (updateError || !updated) {
    return { success: false, error: 'Failed to update content status', status: 500 }
  }

  const { error: historyError } = await supabase.from('approval_histories').insert({
    content_id: contentId,
    action,
    from_status: fromStatus,
    to_status: toStatus,
    comment: comment?.trim() || null,
    performed_by: profile.id,
  })

  if (historyError) {
    console.error('Failed to record approval history:', historyError)
  }

  return { success: true, content: updated }
}

export async function getApprovalQueue(role: UserRole): Promise<Content[]> {
  const supabase = createClient()

  const statuses = APPROVAL_QUEUE_STATUSES[role] || []

  if (statuses.length === 0) return []

  const { data, error } = await supabase
    .from('contents')
    .select('*, pillar:pillars(*), category:categories(*), platform:platforms(*)')
    .in('status', statuses)
    .order('updated_at', { ascending: true })

  if (error) {
    console.error('Error fetching approval queue:', error)
    return []
  }

  return data || []
}

export async function getMyTasks(profileId: string): Promise<{
  drafts: Content[]
  revisions: Content[]
  readyToPublish: Content[]
  submitted: Content[]
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('contents')
    .select('*, pillar:pillars(*), category:categories(*), platform:platforms(*)')
    .eq('created_by', profileId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching my tasks:', error)
    return { drafts: [], revisions: [], readyToPublish: [], submitted: [] }
  }

  const all = data || []

  return {
    drafts: all.filter((c) => ['DRAFT', 'PLANNED', 'IN_PROGRESS'].includes(c.status)),
    revisions: all.filter((c) => c.status === 'REVISION_REQUIRED'),
    readyToPublish: all.filter((c) => c.status === 'READY_TO_PUBLISH'),
    submitted: all.filter((c) => c.status === 'PENDING_REVIEW'),
  }
}
