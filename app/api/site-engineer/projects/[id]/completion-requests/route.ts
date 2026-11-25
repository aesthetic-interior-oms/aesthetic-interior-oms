import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
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
 * GET /api/site-engineer/projects/[id]/completion-requests
 * Lists item completion requests for a project.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireDatabaseRoles([], req)
    if (!authResult.ok) return authResult.response

    const { id: leadId } = await params
    const { isAdmin, isPc, isSiteEngineer } = await getUserRoleFlags(
      authResult.actorUserId,
      authResult.actorRoles,
    )

    if (!isAdmin && !isPc && !isSiteEngineer) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    if (!isAdmin && !isPc && isSiteEngineer) {
      await ensureSiteEngineerAccess(leadId, authResult.actorUserId)
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const requests = await listCompletionRequests({ leadId, status })

    return NextResponse.json({ success: true, data: requests })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      )
    }
    console.error('[GET /api/site-engineer/projects/[id]/completion-requests]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch completion requests' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/site-engineer/projects/[id]/completion-requests
 * Creates a new item completion request for Project Coordinator approval.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireDatabaseRoles([], req)
    if (!authResult.ok) return authResult.response

    const { id: leadId } = await params
    const { isAdmin, isPc, isSiteEngineer } = await getUserRoleFlags(
      authResult.actorUserId,
      authResult.actorRoles,
    )

    if (!isAdmin && !isPc && !isSiteEngineer) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    if (!isAdmin && !isPc && isSiteEngineer) {
      await ensureSiteEngineerAccess(leadId, authResult.actorUserId)
    }

    const body = await req.json().catch(() => ({}))
    const { draftId, lineIds, note } = body as {
      draftId?: string
      lineIds?: string[]
      note?: string
    }

    if (!draftId || !Array.isArray(lineIds)) {
      return NextResponse.json(
        { success: false, error: 'draftId and lineIds array are required' },
        { status: 400 },
      )
    }

    const created = await createCompletionRequest({
      leadId,
      draftId,
      lineIds,
      note,
      userId: authResult.actorUserId,
      userFullName: authResult.actor.fullName,
    })

    return NextResponse.json({
      success: true,
      data: created,
      message: 'Completion request sent to Project Coordinator for approval.',
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      )
    }
    console.error('[POST /api/site-engineer/projects/[id]/completion-requests]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit completion request' },
      { status: 500 },
    )
  }
}
