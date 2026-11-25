import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/mobile-auth'
import {
  getUserRoleFlags,
  listCompletionRequests,
  ServiceError,
} from '@/lib/site-completion-service'
import { SiteItemCompletionRequestStatus } from '@/generated/prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/mobile/pc/completion-requests
 * Lists completion requests for Project Coordinator / Admin in the mobile app.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request)
    if (!authResult.ok) return authResult.response

    const { user } = authResult
    const { isAdmin, isPc } = await getUserRoleFlags(user.id, user.roles)

    if (!isAdmin && !isPc) {
      return NextResponse.json(
        { ok: false, error: 'Only Project Coordinator or Admin can access this endpoint' },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const leadId = searchParams.get('leadId') ?? undefined

    const [requests, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      listCompletionRequests({ leadId, status }),
      prisma.siteItemCompletionRequest.count({
        where: {
          ...(leadId ? { leadId } : {}),
          status: SiteItemCompletionRequestStatus.PENDING,
        },
      }),
      prisma.siteItemCompletionRequest.count({
        where: {
          ...(leadId ? { leadId } : {}),
          status: SiteItemCompletionRequestStatus.APPROVED,
        },
      }),
      prisma.siteItemCompletionRequest.count({
        where: {
          ...(leadId ? { leadId } : {}),
          status: SiteItemCompletionRequestStatus.REJECTED,
        },
      }),
    ])

    return NextResponse.json({
      ok: true,
      data: requests,
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status })
    }
    console.error('[GET /api/mobile/pc/completion-requests]', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to load completion requests' },
      { status: 500 },
    )
  }
}
