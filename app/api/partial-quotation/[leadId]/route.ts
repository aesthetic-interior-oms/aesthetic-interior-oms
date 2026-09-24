import { ActivityType, LeadStage, LeadSubStatus, QuotationDraftStatus, VisitType } from '@/generated/prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { logActivity, logLeadStageChanged, logLeadSubStatusChanged } from '@/lib/activity-log-service'

type RouteContext = { params: { leadId: string } | Promise<{ leadId: string }> }
type LineItem = { id: string; name: string; quantity: number; rate: number; total: number }

async function leadIdOf(context: RouteContext) {
  const { leadId } = await context.params
  return typeof leadId === 'string' && leadId.trim() ? leadId.trim() : null
}

function normalizeLines(value: unknown): LineItem[] | null {
  if (!Array.isArray(value)) return null
  const lines = value.map((line, index) => {
    if (!line || typeof line !== 'object') return null
    const item = line as Record<string, unknown>
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    const quantity = Number(item.quantity)
    const rate = Number(item.rate)
    if (!name || !Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(rate) || rate < 0) return null
    return { id: typeof item.id === 'string' ? item.id : `line-${index}`, name, quantity, rate, total: quantity * rate }
  })
  return lines.every(Boolean) ? lines as LineItem[] : null
}

async function verifyConsultant(leadId: string, userId: string) {
  return prisma.visit.findFirst({
    where: { leadId, visitType: VisitType.PARTIAL_WORK_VISIT, assignedToId: userId, status: 'COMPLETED' },
    select: { id: true },
  })
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const authResult = await requireDatabaseRoles([])
  if (!authResult.ok) return authResult.response
  const leadId = await leadIdOf(context)
  if (!leadId) return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
  const allowed = authResult.actor.userDepartments.includes('SPECIALIST_DESIGN_CONSULTANTS') || authResult.actor.userDepartments.includes('ADMIN')
  if (!allowed) return NextResponse.json({ success: false, error: 'Only Specialist Design Consultants can access partial quotations' }, { status: 403 })
  const [lead, draft, completedVisit] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, name: true, location: true, stage: true, subStatus: true } }),
    prisma.partialQuotationDraft.findUnique({ where: { leadId } }),
    verifyConsultant(leadId, authResult.actorUserId),
  ])
  if (!lead || (!completedVisit && !authResult.actor.userDepartments.includes('ADMIN'))) return NextResponse.json({ success: false, error: 'This partial visit is not available to you' }, { status: 403 })
  return NextResponse.json({ success: true, data: { lead, draft } })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authResult = await requireDatabaseRoles([])
  if (!authResult.ok) return authResult.response
  const leadId = await leadIdOf(context)
  if (!leadId) return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
  const departments = authResult.actor.userDepartments
  const isAdmin = departments.includes('ADMIN')
  if (!isAdmin && !departments.includes('SPECIALIST_DESIGN_CONSULTANTS')) return NextResponse.json({ success: false, error: 'Only Specialist Design Consultants can build partial quotations' }, { status: 403 })
  if (!isAdmin && !await verifyConsultant(leadId, authResult.actorUserId)) return NextResponse.json({ success: false, error: 'Only the consultant who completed this partial visit can build its quotation' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { action?: unknown; lines?: unknown; note?: unknown }
  const action = body.action === 'submit' ? 'submit' : body.action === 'start' ? 'start' : 'save'
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  const lines = body.lines === undefined ? null : normalizeLines(body.lines)
  if (body.lines !== undefined && !lines) return NextResponse.json({ success: false, error: 'Each quotation item needs a name, quantity, and rate' }, { status: 400 })

  try {
    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { stage: true, subStatus: true } })
      if (!lead) throw new Error('NOT_FOUND')
      if (action === 'start') {
        if (lead.stage !== LeadStage.PARTIAL_VISIT_PHASE || (lead.subStatus !== LeadSubStatus.VISIT_COMPLETED && lead.subStatus !== LeadSubStatus.QUOTATION_ASSIGNED && lead.subStatus !== LeadSubStatus.QUOTATION_WORKING)) throw new Error('NOT_READY')
        await tx.lead.update({ where: { id: leadId }, data: { subStatus: LeadSubStatus.QUOTATION_ASSIGNED } })
        await logLeadSubStatusChanged(tx, { leadId, userId: authResult.actorUserId, from: lead.subStatus, to: LeadSubStatus.QUOTATION_ASSIGNED, reason: 'Partial quotation assigned to completing consultant.' })
        return { started: true }
      }
      if (lead.stage !== LeadStage.PARTIAL_VISIT_PHASE) throw new Error('NOT_READY')
      const currentLines = lines ?? []
      const grandTotal = currentLines.reduce((total, item) => total + item.total, 0)
      const status = action === 'submit' ? QuotationDraftStatus.FINALIZED : QuotationDraftStatus.DRAFT
      const draft = await tx.partialQuotationDraft.upsert({
        where: { leadId },
        create: { leadId, createdById: authResult.actorUserId, content: { lines: currentLines, note }, grandTotal, status },
        update: { content: { lines: currentLines, note }, grandTotal, status, updatedById: authResult.actorUserId },
      })
      const nextStatus = action === 'submit' ? LeadSubStatus.QUOTATION_COMPLETED : LeadSubStatus.QUOTATION_WORKING
      if (lead.subStatus !== nextStatus) {
        await tx.lead.update({ where: { id: leadId }, data: { subStatus: nextStatus } })
        await logLeadSubStatusChanged(tx, { leadId, userId: authResult.actorUserId, from: lead.subStatus, to: nextStatus, reason: action === 'submit' ? 'Partial quotation completed.' : 'Partial quotation saved as work in progress.' })
      }
      await logActivity(tx, { leadId, userId: authResult.actorUserId, type: ActivityType.NOTE, description: action === 'submit' ? 'Partial quotation submitted.' : 'Partial quotation draft saved.' })
      return { draft }
    })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const errorMessage = message === 'NOT_FOUND' ? 'Lead not found' : message === 'NOT_READY' ? 'The partial visit must be completed before creating a partial quotation' : 'Unable to save partial quotation'
    return NextResponse.json({ success: false, error: errorMessage }, { status: message === 'NOT_FOUND' ? 404 : 409 })
  }
}
