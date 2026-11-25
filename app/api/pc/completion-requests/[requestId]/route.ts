import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import {
  getUserRoleFlags,
  reviewCompletionRequest,
  ServiceError,
} from '@/lib/site-completion-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/pc/completion-requests/[requestId]
 * Approves or rejects a Site Engineer's item completion request.
 * Only when approved are the selected items marked as completed in the quotation & project progress updated.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const authResult = await requireDatabaseRoles([], req)
    if (!authResult.ok) return authResult.response

    const { isAdmin, isPc } = await getUserRoleFlags(
      authResult.actorUserId,
      authResult.actorRoles,
    )

    if (!isAdmin && !isPc) {
      return NextResponse.json(
        { success: false, error: 'Only Project Coordinator or Admin can approve or reject completion requests' },
        { status: 403 },
      )
    }

    const { requestId } = await params
    const body = await req.json().catch(() => ({}))
    const { action, rejectionReason } = body as {
      action?: 'APPROVE' | 'REJECT'
      rejectionReason?: string
    }

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json(
        { success: false, error: 'action must be APPROVE or REJECT' },
        { status: 400 },
      )
    }

    const result = await reviewCompletionRequest({
      requestId,
      action,
      rejectionReason,
      reviewerId: authResult.actorUserId,
      reviewerFullName: authResult.actor.fullName,
    })

    return NextResponse.json({
      success: true,
      data: result.request,
      scopeProgress: result.scopeProgress,
      message:
        action === 'APPROVE'
          ? 'Completion request approved and project progress updated.'
          : 'Completion request rejected.',
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      )
    }
    console.error('[PATCH /api/pc/completion-requests/[requestId]]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to review completion request' },
      { status: 500 },
    )
  }
}
