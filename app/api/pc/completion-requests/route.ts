import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import {
  getUserRoleFlags,
  listCompletionRequests,
  ServiceError,
} from '@/lib/site-completion-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/pc/completion-requests
 * Lists item completion requests for Project Coordinators & Admins.
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([], req)
    if (!authResult.ok) return authResult.response

    const { isAdmin, isPc } = await getUserRoleFlags(
      authResult.actorUserId,
      authResult.actorRoles,
    )

    if (!isAdmin && !isPc) {
      return NextResponse.json(
        { success: false, error: 'Only Project Coordinator or Admin can view all completion requests' },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const leadId = searchParams.get('leadId') ?? undefined

    const requests = await listCompletionRequests({ leadId, status })

    return NextResponse.json({ success: true, data: requests })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      )
    }
    console.error('[GET /api/pc/completion-requests]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch completion requests' },
      { status: 500 },
    )
  }
}
