import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import {
  buildQuotationLeadWhere,
  canAccessQuotationDraft,
  canEditQuotationDraft,
} from '@/lib/quotation-auth'
import { isShortQuotationContent, isDetailQuotationContent } from '@/lib/quotation-document'
import { buildShortQuotationSummary, normalizeShortQuotationContent } from '@/lib/short-quotation-calculations'
import { calculateQuotationTotals, normalizeQuotationContent } from '@/lib/quotation-calculations'
import type { ShortQuotationContent } from '@/lib/short-quotation-types'
import type { QuotationDraftContent } from '@/lib/quotation-types'
import { LeadAssignmentDepartment } from '@/generated/prisma/client'

type RouteContext = { params: Promise<{ id: string }> }

async function resolveLeadId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params
  const id = resolvedParams?.id
  if (typeof id !== 'string') return null
  const trimmed = id.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * GET /api/lead/[id]/quotation-versions
 *
 * Returns a list of all named quotation versions (both short and detail) for a lead.
 * Each version includes: id, draftKey, versionTitle, documentType, packageTier, grandTotal, sqft, updatedAt
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const leadId = await resolveLeadId(context)
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
    }

    const actorDepartments = authResult.actor.userDepartments ?? []
    if (!canAccessQuotationDraft(actorDepartments)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const leadWhere = buildQuotationLeadWhere({
      leadId,
      actorUserId: authResult.actorUserId,
      actorDepartments,
      actorRoles: authResult.actorRoles,
    })
    if (!leadWhere) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const lead = await prisma.lead.findFirst({
      where: leadWhere,
      select: {
        id: true,
        quotationDrafts: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            draftKey: true,
            quotationType: true,
            projectSqft: true,
            content: true,
            grandTotal: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    const requestedDraftKey = request.nextUrl.searchParams.get('draftKey')
    if (requestedDraftKey) {
      const targetDraft = lead.quotationDrafts.find((d) => d.draftKey === requestedDraftKey)
      if (!targetDraft) {
        return NextResponse.json({ success: false, error: 'Version draft not found' }, { status: 404 })
      }
      return NextResponse.json({
        success: true,
        data: {
          draft: {
            id: targetDraft.id,
            draftKey: targetDraft.draftKey,
            quotationType: targetDraft.quotationType,
            projectSqft: targetDraft.projectSqft,
            content: targetDraft.content,
            grandTotal: targetDraft.grandTotal,
            status: targetDraft.status,
            createdAt: targetDraft.createdAt.toISOString(),
            updatedAt: targetDraft.updatedAt.toISOString(),
          },
        },
      })
    }

    const filterDocType = request.nextUrl.searchParams.get('documentType')

    // Collect user-named versions from both short and detail quotation drafts
    // A version is "named" if the draftKey contains 'version:'
    const versions = lead.quotationDrafts
      .filter((draft) => {
        return draft.draftKey.includes('version:')
      })
      .map((draft) => {
        const content = draft.content as Record<string, unknown>
        const isShort = isShortQuotationContent(draft.content)
        const isDetail = isDetailQuotationContent(draft.content)

        let grandTotal = draft.grandTotal
        let sqft: number | null = draft.projectSqft

        if (isShort) {
          try {
            const normalized = normalizeShortQuotationContent(draft.content as ShortQuotationContent)
            const summary = buildShortQuotationSummary(normalized)
            grandTotal = summary.grandTotal
          } catch { /* use stored grandTotal */ }
        } else if (isDetail) {
          try {
            const normalized = normalizeQuotationContent(draft.content as QuotationDraftContent)
            const totals = calculateQuotationTotals(normalized)
            grandTotal = totals.grandTotal
            sqft = draft.projectSqft
          } catch { /* use stored grandTotal */ }
        }

        const packageTier = isShort
          ? ((content.packageTier as string) ?? null)
          : null

        return {
          id: draft.id,
          draftKey: draft.draftKey,
          versionTitle: typeof content.versionTitle === 'string' ? content.versionTitle : draft.draftKey,
          documentType: isShort ? 'short' : isDetail ? 'detail' : 'unknown',
          packageTier,
          quotationType: draft.quotationType,
          grandTotal,
          sqft,
          updatedAt: draft.updatedAt.toISOString(),
          createdAt: draft.createdAt.toISOString(),
        }
      })
      .filter((v) => {
        if (!filterDocType) return true
        return v.documentType === filterDocType
      })

    return NextResponse.json({ success: true, data: { versions } })
  } catch (error) {
    console.error('[quotation-versions][GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load quotation versions' }, { status: 500 })
  }
}

/**
 * POST /api/lead/[id]/quotation-versions
 *
 * Saves a named version ("Save As") of the current quotation content.
 * Body: { versionTitle: string, content: unknown, documentType: 'short' | 'detail', quotationType: string, projectSqft?: number }
 *
 * Rules:
 * - versionTitle must be unique per lead (all versions across both types)
 * - Creates a new draft with draftKey = `short:version:<sanitized-title>` or `detail:version:<sanitized-title>`
 * - Returns conflict error if name is already taken
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const leadId = await resolveLeadId(context)
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
    }

    const actorDepartments = authResult.actor.userDepartments ?? []
    if (!canAccessQuotationDraft(actorDepartments)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const versionTitle = typeof body.versionTitle === 'string' ? body.versionTitle.trim() : ''
    if (!versionTitle) {
      return NextResponse.json({ success: false, error: 'Version name is required' }, { status: 400 })
    }

    const documentType = body.documentType === 'short' ? 'short' : 'detail'
    const content = body.content
    if (!content || typeof content !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid content' }, { status: 400 })
    }

    const leadWhere = buildQuotationLeadWhere({
      leadId,
      actorUserId: authResult.actorUserId,
      actorDepartments,
      actorRoles: authResult.actorRoles,
    })
    if (!leadWhere) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Check edit permission
    const lead = await prisma.lead.findFirst({
      where: leadWhere,
      select: {
        id: true,
        stage: true,
        subStatus: true,
        visits: {
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          select: { projectSqft: true },
        },
        assignments: {
          where: { department: LeadAssignmentDepartment.QUOTATION },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { userId: true },
        },
        quotationDrafts: {
          select: { draftKey: true, content: true },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    const assignedQuotationUserId = lead.assignments[0]?.userId ?? null
    const canEdit = canEditQuotationDraft({
      actorDepartments,
      actorUserId: authResult.actorUserId,
      leadSubStatus: lead.subStatus,
      assignedQuotationUserId,
      leadStage: lead.stage,
    })

    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to save quotation versions for this lead' },
        { status: 403 },
      )
    }

    // Check uniqueness: version names must be unique across ALL quotation versions for this lead
    const titleLower = versionTitle.toLowerCase()
    const conflictingDraft = lead.quotationDrafts.find((draft) => {
      const c = draft.content as Record<string, unknown>
      if (typeof c.versionTitle !== 'string') return false
      return c.versionTitle.trim().toLowerCase() === titleLower
    })
    if (conflictingDraft) {
      return NextResponse.json(
        { success: false, error: 'DUPLICATE_NAME', message: `A version named "${versionTitle}" already exists for this lead. Please choose a different name.` },
        { status: 409 },
      )
    }

    // Sanitize title for use in draftKey (lowercase, replace spaces/special chars with -)
    const sanitizedKey = versionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
    const baseDraftKey = `${documentType}:version:${sanitizedKey}`

    // Ensure the base key itself is unique (in case two different titles sanitize to the same key)
    const keyConflict = lead.quotationDrafts.find((d) => d.draftKey === baseDraftKey)
    if (keyConflict) {
      // Append a short random suffix
      const suffix = Math.random().toString(36).slice(2, 6)
      // We won't block — just append suffix silently
      const finalKey = `${baseDraftKey}-${suffix}`
      const contentToSave = { ...(content as object), versionTitle }
      const isShort = isShortQuotationContent(content)
      let grandTotal = 0
      if (isShort) {
        try {
          const summary = buildShortQuotationSummary(normalizeShortQuotationContent(content as ShortQuotationContent))
          grandTotal = summary.grandTotal
        } catch { /* ignore */ }
      } else if (isDetailQuotationContent(content)) {
        try {
          const totals = calculateQuotationTotals(normalizeQuotationContent(content as QuotationDraftContent))
          grandTotal = totals.grandTotal
        } catch { /* ignore */ }
      }
      const projectSqftValue = typeof body.projectSqft === 'number' ? body.projectSqft : lead.visits[0]?.projectSqft ?? null
      const saved = await prisma.quotationDraft.create({
        data: {
          leadId: lead.id,
          draftKey: finalKey,
          createdById: authResult.actorUserId,
          updatedById: authResult.actorUserId,
          quotationType: typeof body.quotationType === 'string' ? body.quotationType : 'STANDARD',
          projectSqft: projectSqftValue,
          content: contentToSave,
          grandTotal,
          status: 'DRAFT',
        },
      })
      return NextResponse.json({ success: true, data: { id: saved.id, draftKey: finalKey, versionTitle }, message: 'Version saved' })
    }

    const contentToSave = { ...(content as object), versionTitle }
    const isShort = isShortQuotationContent(content)
    let grandTotal = 0
    if (isShort) {
      try {
        const summary = buildShortQuotationSummary(normalizeShortQuotationContent(content as ShortQuotationContent))
        grandTotal = summary.grandTotal
      } catch { /* ignore */ }
    } else if (isDetailQuotationContent(content)) {
      try {
        const totals = calculateQuotationTotals(normalizeQuotationContent(content as QuotationDraftContent))
        grandTotal = totals.grandTotal
      } catch { /* ignore */ }
    }
    const projectSqftValue = typeof body.projectSqft === 'number' ? body.projectSqft : lead.visits[0]?.projectSqft ?? null
    const quotationTypeStr = typeof body.quotationType === 'string' ? body.quotationType : 'STANDARD'

    const saved = await prisma.quotationDraft.create({
      data: {
        leadId: lead.id,
        draftKey: baseDraftKey,
        createdById: authResult.actorUserId,
        updatedById: authResult.actorUserId,
        quotationType: quotationTypeStr,
        projectSqft: projectSqftValue,
        content: contentToSave,
        grandTotal,
        status: 'DRAFT',
      },
    })

    return NextResponse.json({
      success: true,
      data: { id: saved.id, draftKey: baseDraftKey, versionTitle },
      message: `Version "${versionTitle}" saved successfully`,
    })
  } catch (error) {
    console.error('[quotation-versions][POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save quotation version' }, { status: 500 })
  }
}

/**
 * PUT /api/lead/[id]/quotation-versions
 *
 * Update (Save) an existing named version by its draftKey.
 * Body: { draftKey: string, content: unknown, quotationType?: string, projectSqft?: number }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const leadId = await resolveLeadId(context)
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
    }

    const actorDepartments = authResult.actor.userDepartments ?? []
    if (!canAccessQuotationDraft(actorDepartments)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const draftKey = typeof body.draftKey === 'string' ? body.draftKey.trim() : ''
    if (!draftKey || !draftKey.includes('version:')) {
      return NextResponse.json({ success: false, error: 'Invalid or missing draftKey' }, { status: 400 })
    }

    const content = body.content
    if (!content || typeof content !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid content' }, { status: 400 })
    }

    const leadWhere = buildQuotationLeadWhere({
      leadId,
      actorUserId: authResult.actorUserId,
      actorDepartments,
      actorRoles: authResult.actorRoles,
    })
    if (!leadWhere) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const lead = await prisma.lead.findFirst({
      where: leadWhere,
      select: {
        id: true,
        stage: true,
        subStatus: true,
        visits: { orderBy: { scheduledAt: 'desc' }, take: 1, select: { projectSqft: true } },
        assignments: {
          where: { department: LeadAssignmentDepartment.QUOTATION },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { userId: true },
        },
        quotationDrafts: {
          where: { draftKey },
          select: { id: true, content: true },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    const assignedQuotationUserId = lead.assignments[0]?.userId ?? null
    const canEdit = canEditQuotationDraft({
      actorDepartments,
      actorUserId: authResult.actorUserId,
      leadSubStatus: lead.subStatus,
      assignedQuotationUserId,
      leadStage: lead.stage,
    })

    if (!canEdit) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    const existingDraft = lead.quotationDrafts[0]
    if (!existingDraft) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 })
    }

    // Preserve the existing versionTitle from the stored content
    const existingContent = existingDraft.content as Record<string, unknown>
    const versionTitle = typeof existingContent.versionTitle === 'string' ? existingContent.versionTitle : undefined

    const contentToSave = { ...(content as object), ...(versionTitle ? { versionTitle } : {}) }

    const isShort = isShortQuotationContent(content)
    let grandTotal = 0
    if (isShort) {
      try {
        const summary = buildShortQuotationSummary(normalizeShortQuotationContent(content as ShortQuotationContent))
        grandTotal = summary.grandTotal
      } catch { /* ignore */ }
    } else if (isDetailQuotationContent(content)) {
      try {
        const totals = calculateQuotationTotals(normalizeQuotationContent(content as QuotationDraftContent))
        grandTotal = totals.grandTotal
      } catch { /* ignore */ }
    }
    const projectSqftValue = typeof body.projectSqft === 'number' ? body.projectSqft : lead.visits[0]?.projectSqft ?? null
    const quotationTypeStr = typeof body.quotationType === 'string' ? body.quotationType : 'STANDARD'

    await prisma.quotationDraft.update({
      where: { id: existingDraft.id },
      data: {
        updatedById: authResult.actorUserId,
        quotationType: quotationTypeStr,
        projectSqft: projectSqftValue,
        content: contentToSave,
        grandTotal,
      },
    })

    return NextResponse.json({ success: true, message: `Version "${versionTitle ?? draftKey}" updated` })
  } catch (error) {
    console.error('[quotation-versions][PUT] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update quotation version' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'GET, POST, PUT, OPTIONS' } })
}
