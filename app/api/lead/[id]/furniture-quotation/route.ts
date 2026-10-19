import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { canAccessQuotationDraft, canEditQuotationDraft, buildQuotationLeadWhere } from '@/lib/quotation-auth'
import { buildDefaultFurnitureQuotationContent, type FurnitureQuotationContent, type FurnitureQuotationItem } from '@/lib/furniture-quotation-template'

type RouteContext = { params: Promise<{ id: string }> }

function normalizeContent(value: unknown): FurnitureQuotationContent | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (!Array.isArray(data.items)) return null
  const items: FurnitureQuotationItem[] = []
  for (const [index, raw] of data.items.entries()) {
    if (!raw || typeof raw !== 'object') return null
    const item = raw as Record<string, unknown>
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    const quantity = Number(item.quantity)
    const rate = Number(item.rate)
    if (!name || !Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(rate) || rate < 0) return null
    items.push({
      id: typeof item.id === 'string' ? item.id : `item-${index + 1}`,
      section: item.section === 'Electrical Item' ? 'Electrical Item' : 'Furniture',
      name,
      description: typeof item.description === 'string' ? item.description.slice(0, 5000) : '',
      quantity,
      unit: typeof item.unit === 'string' ? item.unit.slice(0, 80) : 'Nos',
      rate,
      ...(typeof item.unitLabel === 'string' ? { unitLabel: item.unitLabel.slice(0, 80) } : {}),
    })
  }
  return {
    quotationDate: typeof data.quotationDate === 'string' ? data.quotationDate.slice(0, 30) : new Date().toISOString().slice(0, 10),
    subject: typeof data.subject === 'string' ? data.subject.slice(0, 300) : '',
    notes: typeof data.notes === 'string' ? data.notes.slice(0, 5000) : '',
    items,
  }
}

async function access(id: string, actorUserId: string, departments: string[], roles: string[]) {
  if (!canAccessQuotationDraft(departments)) return { response: NextResponse.json({ success: false, error: 'You do not have access to quotation drafts' }, { status: 403 }) }
  const leadWhere = buildQuotationLeadWhere({ leadId: id, actorUserId, actorDepartments: departments, actorRoles: roles })
  if (!leadWhere) return { response: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) }
  const lead = await prisma.lead.findFirst({
    where: leadWhere,
    select: { id: true, name: true, location: true, stage: true, subStatus: true, assignments: { where: { department: 'QUOTATION' }, orderBy: { createdAt: 'desc' }, take: 1, select: { userId: true } } },
  })
  if (!lead) return { response: NextResponse.json({ success: false, error: 'Lead not found or not accessible' }, { status: 404 }) }
  return { lead, canEdit: canEditQuotationDraft({ actorDepartments: departments, actorUserId, leadSubStatus: lead.subStatus, assignedQuotationUserId: lead.assignments[0]?.userId ?? null, leadStage: lead.stage }) }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response
  const { id } = await context.params
  if (!id?.trim()) return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
  const result = await access(id.trim(), auth.actorUserId, auth.actor.userDepartments, auth.actorRoles)
  if ('response' in result) return result.response
  const draft = await prisma.furnitureQuotationDraft.findUnique({ where: { leadId: result.lead.id } })
  const content = draft ? draft.content as unknown as FurnitureQuotationContent : buildDefaultFurnitureQuotationContent({ clientName: result.lead.name, clientAddress: result.lead.location })
  return NextResponse.json({ success: true, data: { lead: result.lead, draft, content, canEdit: result.canEdit } })
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response
  const { id } = await context.params
  if (!id?.trim()) return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
  const result = await access(id.trim(), auth.actorUserId, auth.actor.userDepartments, auth.actorRoles)
  if ('response' in result) return result.response
  if (!result.canEdit) return NextResponse.json({ success: false, error: 'You cannot edit this quotation' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { content?: unknown }
  const content = normalizeContent(body.content)
  if (!content) return NextResponse.json({ success: false, error: 'Each item needs a name, quantity, and unit price' }, { status: 400 })
  const grandTotal = content.items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const draft = await prisma.furnitureQuotationDraft.upsert({
    where: { leadId: result.lead.id },
    create: { leadId: result.lead.id, createdById: auth.actorUserId, updatedById: auth.actorUserId, content: content as never, grandTotal },
    update: { updatedById: auth.actorUserId, content: content as never, grandTotal },
  })
  return NextResponse.json({ success: true, data: { draft, content, grandTotal } })
}
