import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { buildQuotationLeadWhere, canAccessQuotationDraft } from '@/lib/quotation-auth'
import type { FurnitureQuotationContent } from '@/lib/furniture-quotation-template'
import type { ElectricalQuotationContent } from '@/lib/electrical-quotation-template'
import { calculateElectricalGrandTotal } from '@/lib/electrical-quotation-template'
import { isDetailQuotationContent } from '@/lib/quotation-document'
import type { QuotationDraftContent } from '@/lib/quotation-types'
import { buildDetailFloorSummaries, getDetailVersionTitle } from '@/lib/detail-quotation-format'
import {
  type CustomizedQuotationContent,
  calculateCustomizedQuotationTotals,
} from '@/lib/customized-quotation-types'

type RouteContext = { params: Promise<{ id: string }> }

function matchesSlot(draftKey: string, slotIndex: number): boolean {
  if (slotIndex === 1) {
    return (
      draftKey === 'detail' ||
      draftKey === 'detail:slot:1' ||
      draftKey === 'pc:slot:1' ||
      draftKey.startsWith('detail:owner:') ||
      draftKey.startsWith('detail:slot:1:owner:')
    )
  }
  return (
    draftKey === `detail:slot:${slotIndex}` ||
    draftKey === `pc:slot:${slotIndex}` ||
    draftKey.startsWith(`detail:slot:${slotIndex}:owner:`)
  )
}

export async function GET(request: NextRequest, context: RouteContext) {
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

  // Fetch all quotation drafts for this lead to discover slots and customized quotations
  const allDrafts = await prisma.quotationDraft.findMany({
    where: { leadId: lead.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      draftKey: true,
      grandTotal: true,
      content: true,
      updatedAt: true,
    },
  })

  // Evaluate the 3 Detail Quotation slots (Slot 1: Premium, Slot 2: Platinum, Slot 3: Luxury)
  const slotOptions = [1, 2, 3].map((sIndex) => {
    const match = allDrafts.find((d) => matchesSlot(d.draftKey, sIndex))
    let total = 0
    let exists = false
    let parsedContent: QuotationDraftContent | null = null

    if (match?.content && isDetailQuotationContent(match.content as unknown)) {
      parsedContent = match.content as unknown as QuotationDraftContent
      exists = true
      const summaries = buildDetailFloorSummaries(parsedContent)
      total = summaries.reduce((sum, item) => sum + item.total, 0)
      if (total === 0 && typeof match.grandTotal === 'number' && match.grandTotal > 0) {
        total = match.grandTotal
      }
    }

    const customTitle =
      typeof parsedContent?.versionTitle === 'string' && parsedContent.versionTitle.trim()
        ? parsedContent.versionTitle.trim()
        : getDetailVersionTitle(sIndex)

    return {
      slotIndex: sIndex,
      title: customTitle,
      exists,
      grandTotal: total,
      content: parsedContent,
    }
  })

  // Determine requested slot
  const requestedSlotParam = request.nextUrl.searchParams.get('slot')
  let selectedSlot = Number(requestedSlotParam)
  if (![1, 2, 3].includes(selectedSlot)) {
    // Pick the first existing slot, or default to 1
    const existingSlot = slotOptions.find((s) => s.exists)
    selectedSlot = existingSlot ? existingSlot.slotIndex : 1
  }

  const chosenSlotData = slotOptions.find((s) => s.slotIndex === selectedSlot) || slotOptions[0]
  const detailContent = chosenSlotData.content
  const detailVersionTitle = chosenSlotData.title

  // Fetch furniture quotation draft
  const furnitureDraft = await prisma.furnitureQuotationDraft.findUnique({
    where: { leadId: lead.id },
    select: { content: true, grandTotal: true },
  })

  const furnitureContent: FurnitureQuotationContent | null =
    furnitureDraft?.content ? (furnitureDraft.content as unknown as FurnitureQuotationContent) : null

  let furnitureTotal: number | null = null
  if (furnitureContent && Array.isArray(furnitureContent.items) && furnitureContent.items.length > 0) {
    furnitureTotal = Math.round(
      furnitureContent.items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
        0,
      ),
    )
  }

  // Fetch electrical quotation draft
  const electricalDraft = await prisma.electricalQuotationDraft.findUnique({
    where: { leadId: lead.id },
    select: { content: true },
  })

  const electricalContent: ElectricalQuotationContent | null =
    electricalDraft?.content ? (electricalDraft.content as unknown as ElectricalQuotationContent) : null

  let electricalTotal: number | null = null
  let electricalIsApprox = false
  if (electricalContent) {
    const { grandTotal, isApproximate } = calculateElectricalGrandTotal(electricalContent)
    if (grandTotal > 0) {
      electricalTotal = Math.round(grandTotal)
      electricalIsApprox = isApproximate || Boolean(electricalContent.useApproximateTotal)
    }
  }

  // Fetch all customized quotation drafts
  const customizedDrafts = allDrafts.filter((d) => d.draftKey.startsWith('customized'))
  const customizedQuotations = customizedDrafts
    .map((d) => {
      if (!d.content) return null
      const content = d.content as unknown as CustomizedQuotationContent
      const rawTitle = typeof content?.title === 'string' ? content.title.trim() : ''
      const realTitle = rawTitle || 'Quotation'

      let total = 0
      if (content?.lineItems && Array.isArray(content.lineItems)) {
        const calc = calculateCustomizedQuotationTotals(content)
        total = calc.grandTotal
      } else if (typeof d.grandTotal === 'number') {
        total = d.grandTotal
      }

      const hasItems = Array.isArray(content?.lineItems) && content.lineItems.length > 0
      if (!hasItems && total <= 0) return null

      return {
        draftKey: d.draftKey,
        title: realTitle,
        grandTotal: total,
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  return NextResponse.json({
    success: true,
    data: {
      lead: {
        id: lead.id,
        name: lead.name,
        location: lead.location,
      },
      selectedSlot,
      detailVersionTitle,
      availableSlots: slotOptions.map(({ slotIndex, title, exists, grandTotal }) => ({
        slotIndex,
        title,
        exists,
        grandTotal,
      })),
      detailContent,
      furnitureContent,
      furnitureTotal,
      electricalContent,
      electricalTotal,
      electricalIsApprox,
      customizedQuotations,
      quotationDate: detailContent?.quotationDate ?? null,
    },
  })
}
