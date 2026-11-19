import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { buildQuotationLeadWhere, canAccessQuotationDraft, canEditQuotationDraft } from '@/lib/quotation-auth'
import {
  buildDefaultCustomizedQuotationContent,
  calculateCustomizedQuotationTotals,
  type CustomizedQuotationContent,
  DEFAULT_CUSTOMIZED_TITLE,
} from '@/lib/customized-quotation-types'
import { Prisma, QuotationWorkType } from '@/generated/prisma/client'
import { logQuotationWorkActivity } from '@/lib/quotation-daily-work'

type RouteContext = { params: Promise<{ id: string }> }

async function getLeadAccess(id: string, actorUserId: string, departments: string[], roles: string[]) {
  if (!canAccessQuotationDraft(departments)) {
    return { response: NextResponse.json({ success: false, error: 'You do not have access to quotation drafts' }, { status: 403 }) }
  }
  const leadWhere = buildQuotationLeadWhere({ leadId: id, actorUserId, actorDepartments: departments, actorRoles: roles })
  if (!leadWhere) return { response: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  const lead = await prisma.lead.findFirst({
    where: leadWhere,
    select: {
      id: true,
      name: true,
      location: true,
      stage: true,
      subStatus: true,
      assignments: {
        where: { department: 'QUOTATION' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { userId: true },
      },
    },
  })
  if (!lead) return { response: NextResponse.json({ success: false, error: 'Lead not found or not accessible' }, { status: 404 }) }
  const canEdit = canEditQuotationDraft({
    actorDepartments: departments,
    actorUserId,
    leadSubStatus: lead.subStatus,
    assignedQuotationUserId: lead.assignments[0]?.userId ?? null,
    leadStage: lead.stage,
  })
  return { lead, canEdit }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return auth.response
    const { id } = await context.params
    if (!id?.trim()) return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })

    const result = await getLeadAccess(id.trim(), auth.actorUserId, auth.actor.userDepartments, auth.actorRoles)
    if ('response' in result) return result.response

    const drafts = await prisma.quotationDraft.findMany({
      where: {
        leadId: result.lead.id,
        draftKey: { startsWith: 'customized' },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (drafts.length === 0) {
      // Auto-initialize first customized draft
      const defaultContent = buildDefaultCustomizedQuotationContent({
        title: DEFAULT_CUSTOMIZED_TITLE,
        clientName: result.lead.name,
        clientAddress: result.lead.location ?? '',
      })
      const defaultTotals = calculateCustomizedQuotationTotals(defaultContent)

      const initialDraft = await prisma.quotationDraft.create({
        data: {
          leadId: result.lead.id,
          createdById: auth.actorUserId,
          draftKey: 'customized:default',
          quotationType: 'STANDARD',
          content: defaultContent as unknown as Prisma.InputJsonValue,
          grandTotal: defaultTotals.grandTotal,
          status: 'DRAFT',
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          quotations: [
            {
              id: initialDraft.id,
              draftKey: initialDraft.draftKey,
              title: defaultContent.title,
              grandTotal: initialDraft.grandTotal,
              projectSqft: initialDraft.projectSqft,
              content: defaultContent,
              updatedAt: initialDraft.updatedAt.toISOString(),
            },
          ],
          canEdit: result.canEdit,
        },
      })
    }

    const quotations = drafts.map((draft) => {
      const content = draft.content as unknown as CustomizedQuotationContent
      const title = content?.title || 'Customized Quotation'
      return {
        id: draft.id,
        draftKey: draft.draftKey,
        title,
        grandTotal: draft.grandTotal,
        projectSqft: draft.projectSqft,
        content,
        updatedAt: draft.updatedAt.toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        quotations,
        canEdit: result.canEdit,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch customized quotations' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return auth.response
    const { id } = await context.params
    if (!id?.trim()) return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })

    const result = await getLeadAccess(id.trim(), auth.actorUserId, auth.actor.userDepartments, auth.actorRoles)
    if ('response' in result) return result.response
    if (!result.canEdit) {
      return NextResponse.json({ success: false, error: 'You do not have permission to create quotations' }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : `Customized Quotation ${Date.now().toString().slice(-4)}`

    const newDraftKey = `customized:${Date.now()}`
    const defaultContent = buildDefaultCustomizedQuotationContent({
      title,
      clientName: result.lead.name,
      clientAddress: result.lead.location ?? '',
    })
    const totals = calculateCustomizedQuotationTotals(defaultContent)

    const createdDraft = await prisma.quotationDraft.create({
      data: {
        leadId: result.lead.id,
        createdById: auth.actorUserId,
        draftKey: newDraftKey,
        quotationType: 'STANDARD',
        content: defaultContent as unknown as Prisma.InputJsonValue,
        grandTotal: totals.grandTotal,
        status: 'DRAFT',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        quotation: {
          id: createdDraft.id,
          draftKey: createdDraft.draftKey,
          title,
          grandTotal: createdDraft.grandTotal,
          projectSqft: createdDraft.projectSqft,
          content: defaultContent,
          updatedAt: createdDraft.updatedAt.toISOString(),
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create customized quotation' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return auth.response
    const { id } = await context.params
    if (!id?.trim()) return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })

    const result = await getLeadAccess(id.trim(), auth.actorUserId, auth.actor.userDepartments, auth.actorRoles)
    if ('response' in result) return result.response
    if (!result.canEdit) {
      return NextResponse.json({ success: false, error: 'You do not have permission to edit quotations' }, { status: 403 })
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const draftKey = typeof body.draftKey === 'string' && body.draftKey.trim() ? body.draftKey.trim() : 'customized:default'
    const content = body.content as CustomizedQuotationContent

    if (!content || typeof content !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid quotation content' }, { status: 400 })
    }

    const totals = calculateCustomizedQuotationTotals(content)
    const projectSqft = typeof body.projectSqft === 'number' && Number.isFinite(body.projectSqft) ? body.projectSqft : content.projectSqft ?? null

    const upserted = await prisma.quotationDraft.upsert({
      where: {
        leadId_draftKey: {
          leadId: result.lead.id,
          draftKey,
        },
      },
      create: {
        leadId: result.lead.id,
        createdById: auth.actorUserId,
        draftKey,
        quotationType: 'STANDARD',
        projectSqft,
        content: content as unknown as Prisma.InputJsonValue,
        grandTotal: totals.grandTotal,
        status: 'DRAFT',
      },
      update: {
        updatedById: auth.actorUserId,
        projectSqft,
        content: content as unknown as Prisma.InputJsonValue,
        grandTotal: totals.grandTotal,
        status: 'DRAFT',
      },
    })

    // Log quotation work activity
    try {
      await logQuotationWorkActivity(
        auth.actorUserId,
        result.lead.id,
        QuotationWorkType.DETAIL,
        `Updated customized quotation "${content.title || 'Customized Quotation'}"`,
      )
    } catch {
      // Activity logging error should not block saving
    }

    return NextResponse.json({
      success: true,
      data: {
        quotation: {
          id: upserted.id,
          draftKey: upserted.draftKey,
          title: content.title || 'Customized Quotation',
          grandTotal: upserted.grandTotal,
          projectSqft: upserted.projectSqft,
          content,
          updatedAt: upserted.updatedAt.toISOString(),
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save customized quotation' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireDatabaseRoles([])
    if (!auth.ok) return auth.response
    const { id } = await context.params
    if (!id?.trim()) return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })

    const result = await getLeadAccess(id.trim(), auth.actorUserId, auth.actor.userDepartments, auth.actorRoles)
    if ('response' in result) return result.response
    if (!result.canEdit) {
      return NextResponse.json({ success: false, error: 'You do not have permission to delete quotations' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const draftKey = searchParams.get('draftKey')
    if (!draftKey || !draftKey.startsWith('customized')) {
      return NextResponse.json({ success: false, error: 'Invalid draftKey' }, { status: 400 })
    }

    await prisma.quotationDraft.deleteMany({
      where: {
        leadId: result.lead.id,
        draftKey,
      },
    })

    return NextResponse.json({ success: true, message: 'Customized quotation deleted' })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete customized quotation' },
      { status: 500 },
    )
  }
}
