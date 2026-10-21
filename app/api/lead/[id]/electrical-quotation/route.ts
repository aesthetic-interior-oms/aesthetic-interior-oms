import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { buildQuotationLeadWhere, canAccessQuotationDraft, canEditQuotationDraft } from '@/lib/quotation-auth'
import {
  buildDefaultElectricalQuotationContent,
  calculateElectricalGrandTotal,
  type ElectricalQuotationContent,
  type ElectricalQuotationItem,
} from '@/lib/electrical-quotation-template'

type RouteContext = { params: Promise<{ id: string }> }

function normalizeContent(value: unknown): ElectricalQuotationContent | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (!Array.isArray(data.items)) return null
  const items: ElectricalQuotationItem[] = []
  for (const [index, raw] of data.items.entries()) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Record<string, unknown>
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    if (!name) continue

    const qtyNum = item.quantity === null || item.quantity === undefined || item.quantity === '' ? null : Number(item.quantity)
    const rateNum = item.rate === null || item.rate === undefined || item.rate === '' ? null : Number(item.rate)

    items.push({
      id: typeof item.id === 'string' && item.id ? item.id : `item-${index + 1}`,
      serialNo: typeof item.serialNo === 'number' ? item.serialNo : index + 1,
      name,
      description: typeof item.description === 'string' ? item.description.slice(0, 5000) : '',
      quantity: qtyNum != null && Number.isFinite(qtyNum) && qtyNum >= 0 ? qtyNum : null,
      unit: typeof item.unit === 'string' ? item.unit.slice(0, 80) : '',
      rate: rateNum != null && Number.isFinite(rateNum) && rateNum >= 0 ? rateNum : null,
    })
  }

  const approxNum = data.approximateGrandTotal === null || data.approximateGrandTotal === undefined || data.approximateGrandTotal === ''
    ? null
    : Number(data.approximateGrandTotal)

  return {
    quotationDate: typeof data.quotationDate === 'string' ? data.quotationDate.slice(0, 30) : new Date().toISOString().slice(0, 10),
    subject: typeof data.subject === 'string' ? data.subject.slice(0, 300) : '',
    notes: typeof data.notes === 'string' ? data.notes.slice(0, 5000) : '',
    excludedItems: typeof data.excludedItems === 'string' ? data.excludedItems.slice(0, 2000) : '',
    items,
    useApproximateTotal: Boolean(data.useApproximateTotal),
    approximateGrandTotal: approxNum != null && Number.isFinite(approxNum) && approxNum >= 0 ? approxNum : null,
  }
}

async function getLeadAccess(id: string, actorUserId: string, departments: string[], roles: string[]) {
  if (!canAccessQuotationDraft(departments)) {
    return { response: NextResponse.json({ success: false, error: 'You do not have access to quotation drafts' }, { status: 403 }) }
  }
  const leadWhere = buildQuotationLeadWhere({ leadId: id, actorUserId, actorDepartments: departments, actorRoles: roles })
  if (!leadWhere) return { response: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  const lead = await prisma.lead.findFirst({
    where: leadWhere,
    select: { id: true, name: true, location: true, stage: true, subStatus: true, assignments: { where: { department: 'QUOTATION' }, orderBy: { createdAt: 'desc' }, take: 1, select: { userId: true } } },
  })
  if (!lead) return { response: NextResponse.json({ success: false, error: 'Lead not found or not accessible' }, { status: 404 }) }
  const canEdit = canEditQuotationDraft({ actorDepartments: departments, actorUserId, leadSubStatus: lead.subStatus, assignedQuotationUserId: lead.assignments[0]?.userId ?? null, leadStage: lead.stage })
  return { lead, canEdit }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response
  const { id } = await context.params
  if (!id?.trim()) return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
  const result = await getLeadAccess(id.trim(), auth.actorUserId, auth.actor.userDepartments, auth.actorRoles)
  if ('response' in result) return result.response
  const draft = await prisma.electricalQuotationDraft.findUnique({ where: { leadId: result.lead.id } })
  const content = draft ? draft.content as unknown as ElectricalQuotationContent : buildDefaultElectricalQuotationContent()
  return NextResponse.json({ success: true, data: { lead: result.lead, draft, content, canEdit: result.canEdit } })
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response
  const { id } = await context.params
  if (!id?.trim()) return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
  const result = await getLeadAccess(id.trim(), auth.actorUserId, auth.actor.userDepartments, auth.actorRoles)
  if ('response' in result) return result.response
  if (!result.canEdit) return NextResponse.json({ success: false, error: 'You cannot edit this quotation' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { content?: unknown }
  const content = normalizeContent(body.content)
  if (!content) return NextResponse.json({ success: false, error: 'Invalid quotation content' }, { status: 400 })
  const { grandTotal } = calculateElectricalGrandTotal(content)
  const draft = await prisma.electricalQuotationDraft.upsert({
    where: { leadId: result.lead.id },
    create: { leadId: result.lead.id, createdById: auth.actorUserId, updatedById: auth.actorUserId, content: content as never, grandTotal },
    update: { updatedById: auth.actorUserId, content: content as never, grandTotal },
  })
  return NextResponse.json({ success: true, data: { draft, content, grandTotal } })
}
