import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/mobile-auth'
import {
  computeDraftScopeProgress,
  getUserRoleFlags,
} from '@/lib/site-completion-service'
import { LeadAssignmentDepartment, SiteItemCompletionRequestStatus } from '@/generated/prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/mobile/site-engineer/projects
 * Lists active site projects for the mobile app with PC-approved progress and pending completion request counts.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireMobileAuth(request)
    if (!authResult.ok) return authResult.response

    const { user } = authResult
    const { isAdmin, isPc, isSiteEngineer } = await getUserRoleFlags(user.id, user.roles)

    if (!isAdmin && !isPc && !isSiteEngineer) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden: Site Engineer, Project Coordinator, or Admin access required' },
        { status: 403 },
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()

    const where: Record<string, unknown> = {
      isSiteWorkActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { location: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    if (!isAdmin && !isPc && isSiteEngineer) {
      where.OR = [
        {
          assignments: {
            some: {
              department: LeadAssignmentDepartment.SITE_ENGINEER,
              userId: user.id,
            },
          },
        },
        {
          assignments: {
            none: {
              department: LeadAssignmentDepartment.SITE_ENGINEER,
            },
          },
        },
      ]
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { siteWorkStartedAt: 'desc' },
      select: {
        id: true,
        name: true,
        location: true,
        phone: true,
        stage: true,
        subStatus: true,
        agreementType: true,
        agreementSqft: true,
        siteWorkStartedAt: true,
        quotationDrafts: {
          select: {
            id: true,
            draftKey: true,
            projectSqft: true,
            content: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        siteItemCompletionRequests: {
          where: { status: SiteItemCompletionRequestStatus.PENDING },
          select: { id: true },
        },
      },
    })

    const data = leads.map((lead) => {
      const activeDraft =
        lead.quotationDrafts.find((d) => d.draftKey?.startsWith('detail')) ??
        lead.quotationDrafts[0] ??
        null
      const scopeProgress = computeDraftScopeProgress(activeDraft?.content)

      return {
        id: lead.id,
        name: lead.name,
        location: lead.location,
        phone: lead.phone,
        stage: lead.stage,
        subStatus: lead.subStatus,
        agreementType: lead.agreementType,
        agreementSqft: lead.agreementSqft ?? activeDraft?.projectSqft ?? null,
        siteWorkStartedAt: lead.siteWorkStartedAt,
        activeDraftId: activeDraft?.id ?? null,
        scopeProgress,
        pendingCompletionRequestsCount: lead.siteItemCompletionRequests.length,
      }
    })

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('[GET /api/mobile/site-engineer/projects] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to load projects' },
      { status: 500 },
    )
  }
}
