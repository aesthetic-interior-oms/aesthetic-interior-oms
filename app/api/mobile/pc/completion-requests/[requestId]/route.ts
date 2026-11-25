import { NextRequest, NextResponse } from 'next/server'
import { requireMobileAuth } from '@/lib/mobile-auth'
import {
  getUserRoleFlags,
  reviewCompletionRequest,
  ServiceError,
} from '@/lib/site-completion-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/mobile/pc/completion-requests/[requestId]
 * Approves or rejects a Site Engineer's completion request from the mobile app.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const authResult = await requireMobileAuth(request)
    if (!authResult.ok) return authResult.response

    const { user } = authResult
    const { isAdmin, isPc } = await getUserRoleFlags(user.id, user.roles)

    if (!isAdmin && !isPc) {
      return NextResponse.json(
        { ok: false, error: 'Only Project Coordinator or Admin can review completion requests' },
        { status: 403 },
      )
    }

    const { requestId } = await params
    const body = await request.json().catch(() => ({}))
    const { action, rejectionReason } = body as {
      action?: 'APPROVE' | 'REJECT'
      rejectionReason?: string
    }

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json(
        { ok: false, error: 'action must be APPROVE or REJECT' },
        { status: 400 },
      )
    }

    const result = await reviewCompletionRequest({
      requestId,
      action,
      rejectionReason,
      reviewerId: user.id,
      reviewerFullName: user.fullName,
    })

    return NextResponse.json({
      ok: true,
      data: result.request,
      scopeProgress: result.scopeProgress,
      message:
        action === 'APPROVE'
          ? 'Completion request approved and project progress updated.'
          : 'Completion request rejected.',
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status })
    }
    console.error('[PATCH /api/mobile/pc/completion-requests/[requestId]]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to review completion request' },
      { status: 500 },
    )
  }
}
