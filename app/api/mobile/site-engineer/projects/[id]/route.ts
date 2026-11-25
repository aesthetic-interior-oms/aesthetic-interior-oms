import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireMobileAuth } from '@/lib/mobile-auth'
import {
  computeDraftScopeProgress,
  ensureSiteEngineerAccess,
  getUserRoleFlags,
  ServiceError,
} from '@/lib/site-completion-service'
import { SiteItemCompletionRequestStatus } from '@/generated/prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/mobile/site-engineer/projects/[id]
 * Returns project details, normalized quotation line items (with completed & pendingApproval flags),
 * scopeProgress (based strictly on PC-approved items), and completionRequests history.
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

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        location: true,
        phone: true,
        stage: true,
        subStatus: true,
        agreementType: true,
        agreementSqft: true,
        isSiteWorkActive: true,
        siteWorkStartedAt: true,
        quotationDrafts: {
          select: {
            id: true,
            draftKey: true,
            quotationType: true,
            projectSqft: true,
            content: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        siteItemCompletionRequests: {
          orderBy: { createdAt: 'desc' },
          include: {
            requestedBy: { select: { id: true, fullName: true, email: true } },
            reviewedBy: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 })
    }

    const activeDraft =
      lead.quotationDrafts.find((d) => d.draftKey?.startsWith('detail')) ??
      lead.quotationDrafts[0] ??
      null

    const content = (activeDraft?.content as Record<string, unknown>) ?? {}
    const rawSections = Array.isArray(content.sections)
      ? (content.sections as Array<{ id?: string; name?: string }>)
      : Array.isArray(content.floors)
        ? (content.floors as Array<{ id?: string; name?: string }>)
        : []
    const rawAreas = Array.isArray(content.areas)
      ? (content.areas as Array<{ id?: string; name?: string; floorId?: string }>)
      : []
    const rawLineItems = Array.isArray(content.lineItems)
      ? (content.lineItems as Array<Record<string, unknown>>)
      : []

    const sectionMap = new Map<string, string>()
    for (const s of rawSections) {
      if (s.id && s.name) sectionMap.set(s.id, s.name)
    }

    const areaMap = new Map<string, { name: string; floorId?: string }>()
    for (const a of rawAreas) {
      if (a.id && a.name) areaMap.set(a.id, { name: a.name, floorId: a.floorId })
    }

    const pendingLineIds = new Set<string>()
    for (const req of lead.siteItemCompletionRequests) {
      if (req.status === SiteItemCompletionRequestStatus.PENDING) {
        for (const id of req.lineIds) pendingLineIds.add(id)
      }
    }

    const items = rawLineItems
      .filter((item) => item && item.included !== false && typeof item.id === 'string')
      .map((item) => {
        const lineId = item.id as string
        const sectionId = typeof item.sectionId === 'string' ? item.sectionId : null
        const areaId = typeof item.areaId === 'string' ? item.areaId : null
        const areaInfo = areaId ? areaMap.get(areaId) : undefined

        const floorName =
          (sectionId && sectionMap.get(sectionId)) ||
          (areaInfo?.floorId && sectionMap.get(areaInfo.floorId)) ||
          'General Floor / Scope'
        const areaName = areaInfo?.name || 'General Area'

        return {
          id: lineId,
          description: String(item.description || 'Custom Product / Work Scope'),
          materials: typeof item.materials === 'string' ? item.materials : null,
          quantity: typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || null,
          unit: typeof item.unit === 'string' ? item.unit : null,
          floorId: sectionId ?? areaInfo?.floorId ?? 'general-floor',
          floorName,
          areaId: areaId ?? 'general-area',
          areaName,
          completed: item.completed === true,
          pendingApproval: item.completed !== true && pendingLineIds.has(lineId),
        }
      })

    const scopeProgress = computeDraftScopeProgress(activeDraft?.content)

    return NextResponse.json({
      ok: true,
      data: {
        project: {
          id: lead.id,
          name: lead.name,
          location: lead.location,
          phone: lead.phone,
          stage: lead.stage,
          subStatus: lead.subStatus,
          agreementType: lead.agreementType,
          agreementSqft: lead.agreementSqft ?? activeDraft?.projectSqft ?? null,
          isSiteWorkActive: lead.isSiteWorkActive,
          siteWorkStartedAt: lead.siteWorkStartedAt,
        },
        activeDraftId: activeDraft?.id ?? null,
        scopeProgress,
        items,
        completionRequests: lead.siteItemCompletionRequests,
      },
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status })
    }
    console.error('[GET /api/mobile/site-engineer/projects/[id]] Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to load project details' },
      { status: 500 },
    )
  }
}
