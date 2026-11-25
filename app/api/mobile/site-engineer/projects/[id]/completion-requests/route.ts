import { NextRequest, NextResponse } from 'next/server'
import { requireMobileAuth } from '@/lib/mobile-auth'
import {
  createCompletionRequest,
  ensureSiteEngineerAccess,
  getUserRoleFlags,
  listCompletionRequests,
  ServiceError,
} from '@/lib/site-completion-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/mobile/site-engineer/projects/[id]/completion-requests
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireMobileAuth(request)
    if (!authResult.ok) return authResult.response

    const { user } = authResult
    const { id: leadId } = await params
    const { isAdmin, isPc, isSiteEngineer } = await getUserRoleFlags(user.id, user.roles)

    if (!isAdmin && !isPc && !isSiteEngineer) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    if (!isAdmin && !isPc && isSiteEngineer) {
      await ensureSiteEngineerAccess(leadId, user.id)
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const requests = await listCompletionRequests({ leadId, status })
    return NextResponse.json({ ok: true, data: requests })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status })
    }
    console.error('[GET /api/mobile/site-engineer/projects/[id]/completion-requests]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to load completion requests' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/mobile/site-engineer/projects/[id]/completion-requests
 * Submits one or multiple completed items for Project Coordinator approval.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireMobileAuth(request)
    if (!authResult.ok) return authResult.response

    const { user } = authResult
    const { id: leadId } = await params
    const { isAdmin, isPc, isSiteEngineer } = await getUserRoleFlags(user.id, user.roles)

    if (!isAdmin && !isPc && !isSiteEngineer) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    if (!isAdmin && !isPc && isSiteEngineer) {
      await ensureSiteEngineerAccess(leadId, user.id)
    }

    const body = await request.json().catch(() => ({}))
    const { draftId, lineIds, note } = body as {
      draftId?: string
      lineIds?: string[]
      note?: string
    }

    if (!draftId || !Array.isArray(lineIds)) {
      return NextResponse.json(
        { ok: false, error: 'draftId and lineIds array are required' },
        { status: 400 },
      )
    }

    const created = await createCompletionRequest({
      leadId,
      draftId,
      lineIds,
      note,
      userId: user.id,
      userFullName: user.fullName,
    })

    return NextResponse.json({
      ok: true,
      data: created,
      message: 'Completion request sent to Project Coordinator for approval.',
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status })
    }
    console.error('[POST /api/mobile/site-engineer/projects/[id]/completion-requests]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to submit completion request' },
      { status: 500 },
    )
  }
}
