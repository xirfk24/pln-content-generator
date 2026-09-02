import { NextRequest, NextResponse } from 'next/server'
import { performWorkflowAction } from '@/services/approval'
import { WORKFLOW_ACTIONS } from '@/constants/workflow'
import type { ApprovalAction } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const action = body.action as ApprovalAction

  if (!action || !(action in WORKFLOW_ACTIONS)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const result = await performWorkflowAction(id, action, body.comment)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ content: result.content })
}
