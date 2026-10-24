import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { buildQuotationLeadWhere, canAccessQuotationDraft } from '@/lib/quotation-auth'
import type { FurnitureQuotationContent } from '@/lib/furniture-quotation-template'
import type { ElectricalQuotationContent } from '@/lib/electrical-quotation-template'
import { isDetailQuotationContent } from '@/lib/quotation-document'
import type { QuotationDraftContent } from '@/lib/quotation-types'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response

  const { id } = await context.params
  if (!id?.trim()) {
    return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
  }
  const leadId = id.trim()

  if (!canAccessQuotationDraft(auth.actor.userDepartments)) {
    return NextResponse.json(
      { success: false, error: 'You do not have access to quotation drafts' },
      { status: 403 },
    )
  }

  const leadWhere = buildQuotationLeadWhere({
    leadId,
    actorUserId: auth.actorUserId,
    actorDepartments: auth.actor.userDepartments,
    actorRoles: auth.actorRoles,
  })
  if (!leadWhere) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const lead = await prisma.lead.findFirst({
    where: leadWhere,
    select: { id: true, name: true, location: true },
  })
  if (!lead) {
    return NextResponse.json(
      { success: false, error: 'Lead not found or not accessible' },
      { status: 404 },
    )
  }

  // Fetch detail quotation draft (use draftKey='detail' which is the default)
  const detailDraft = await prisma.quotationDraft.findFirst({
    where: { leadId: lead.id },
    orderBy: { updatedAt: 'desc' },
    select: { content: true, updatedAt: true },
  })

  // Fetch furniture quotation draft
  const furnitureDraft = await prisma.furnitureQuotationDraft.findUnique({
    where: { leadId: lead.id },
    select: { content: true, grandTotal: true },
  })

  // Fetch electrical quotation draft
  const electricalDraft = await prisma.electricalQuotationDraft.findUnique({
    where: { leadId: lead.id },
    select: { content: true },
  })

  // Parse detail content
  let detailContent: QuotationDraftContent | null = null
  if (detailDraft?.content) {
    const raw = detailDraft.content as unknown
    if (isDetailQuotationContent(raw)) {
      detailContent = raw
    }
  }

  // Parse furniture content
  const furnitureContent: FurnitureQuotationContent | null =
    furnitureDraft?.content ? (furnitureDraft.content as unknown as FurnitureQuotationContent) : null

  // Parse electrical content
  const electricalContent: ElectricalQuotationContent | null =
    electricalDraft?.content ? (electricalDraft.content as unknown as ElectricalQuotationContent) : null

  return NextResponse.json({
    success: true,
    data: {
      lead: {
        id: lead.id,
        name: lead.name,
        location: lead.location,
      },
      detailContent,
      furnitureContent,
      electricalContent,
      quotationDate: detailContent?.quotationDate ?? null,
    },
  })
}
