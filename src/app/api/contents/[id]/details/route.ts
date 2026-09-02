import { NextRequest, NextResponse } from 'next/server'
import { getContentWithDetails, getApprovalHistory, getPublications } from '@/services/content-details'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  const content = await getContentWithDetails(id)
  
  if (!content) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 })
  }
  
  const [approvals, publications] = await Promise.all([
    getApprovalHistory(id),
    getPublications(id),
  ])
  
  return NextResponse.json({
    content,
    approvals,
    publications,
  })
}
