import { ActivityType, LeadAssignmentDepartment, LeadStage, LeadSubStatus, QuotationDraftStatus, VisitType } from '@/generated/prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { logActivity, logLeadStageChanged, logLeadSubStatusChanged } from '@/lib/activity-log-service'

type RouteContext = { params: Promise<{ leadId: string }> }
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
  const [completedOrAssignedVisit, assignment, createdActivity, leadAssigned] = await Promise.all([
    prisma.visit.findFirst({
      where: { leadId, visitType: VisitType.PARTIAL_WORK_VISIT, assignedToId: userId },
      select: { id: true },
    }),
    prisma.leadAssignment.findFirst({
      where: { leadId, userId, department: LeadAssignmentDepartment.SPECIALIST_DESIGN_CONSULTANTS },
      select: { id: true },
    }),
    prisma.activityLog.findFirst({
      where: { leadId, userId, type: ActivityType.LEAD_CREATED },
      select: { id: true },
    }),
    prisma.lead.findFirst({
      where: { id: leadId, assignedTo: userId },
      select: { id: true },
    }),
  ])
  return Boolean(completedOrAssignedVisit || assignment || createdActivity || leadAssigned)
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const authResult = await requireDatabaseRoles([])
  if (!authResult.ok) return authResult.response
  const leadId = await leadIdOf(context)
  if (!leadId) return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
  const allowed = authResult.actor.userDepartments.includes('SPECIALIST_DESIGN_CONSULTANTS') || authResult.actor.userDepartments.includes('ADMIN')
  if (!allowed) return NextResponse.json({ success: false, error: 'Only Specialist Design Consultants can access partial quotations' }, { status: 403 })
  const [lead, draft, isAllowedConsultant] = await Promise.all([
    prisma.lead.findUnique({ where: { id: leadId }, select: { id: true, name: true, location: true, stage: true, subStatus: true } }),
    prisma.partialQuotationDraft.findUnique({ where: { leadId } }),
    verifyConsultant(leadId, authResult.actorUserId),
  ])
  if (!lead || (!isAllowedConsultant && !authResult.actor.userDepartments.includes('ADMIN'))) return NextResponse.json({ success: false, error: 'This client is not accessible to you' }, { status: 403 })
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
  if (!isAdmin && !await verifyConsultant(leadId, authResult.actorUserId)) return NextResponse.json({ success: false, error: 'You are not assigned to this client' }, { status: 403 })
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
        const stageChanged = lead.stage !== LeadStage.PARTIAL_QUOTATION_PHASE
        const subStatusChanged = lead.subStatus !== LeadSubStatus.QUOTATION_WORKING

        if (stageChanged || subStatusChanged) {
          await tx.lead.update({
            where: { id: leadId },
            data: {
              stage: LeadStage.PARTIAL_QUOTATION_PHASE,
              subStatus: LeadSubStatus.QUOTATION_WORKING,
            },
          })
          if (stageChanged) {
            await logLeadStageChanged(tx, {
              leadId,
              userId: authResult.actorUserId,
              from: lead.stage,
              to: LeadStage.PARTIAL_QUOTATION_PHASE,
              reason: 'Started partial quotation workflow.',
            })
          }
          if (subStatusChanged) {
            await logLeadSubStatusChanged(tx, {
              leadId,
              userId: authResult.actorUserId,
              from: lead.subStatus,
              to: LeadSubStatus.QUOTATION_WORKING,
              reason: 'Quotation working in progress.',
            })
          }
        }
        return { started: true }
      }

      const currentLines = lines ?? []
      const grandTotal = currentLines.reduce((total, item) => total + item.total, 0)
      const status = action === 'submit' ? QuotationDraftStatus.FINALIZED : QuotationDraftStatus.DRAFT
      const draft = await tx.partialQuotationDraft.upsert({
        where: { leadId },
        create: { leadId, createdById: authResult.actorUserId, content: { lines: currentLines, note }, grandTotal, status },
        update: { content: { lines: currentLines, note }, grandTotal, status, updatedById: authResult.actorUserId },
      })
      const nextStatus = action === 'submit' ? LeadSubStatus.QUOTATION_COMPLETED : LeadSubStatus.QUOTATION_WORKING

      await tx.lead.update({
        where: { id: leadId },
        data: {
          stage: LeadStage.PARTIAL_QUOTATION_PHASE,
          subStatus: nextStatus,
        },
      })

      if (lead.stage !== LeadStage.PARTIAL_QUOTATION_PHASE) {
        await logLeadStageChanged(tx, {
          leadId,
          userId: authResult.actorUserId,
          from: lead.stage,
          to: LeadStage.PARTIAL_QUOTATION_PHASE,
          reason: 'Partial quotation updated.',
        })
      }
      if (lead.subStatus !== nextStatus) {
        await logLeadSubStatusChanged(tx, {
          leadId,
          userId: authResult.actorUserId,
          from: lead.subStatus,
          to: nextStatus,
          reason: action === 'submit' ? 'Partial quotation completed.' : 'Partial quotation saved as work in progress.',
        })
      }
      await logActivity(tx, { leadId, userId: authResult.actorUserId, type: ActivityType.NOTE, description: action === 'submit' ? 'Partial quotation submitted.' : 'Partial quotation draft saved.' })
      return { draft }
    })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const errorMessage = message === 'NOT_FOUND' ? 'Lead not found' : 'Unable to save partial quotation'
    return NextResponse.json({ success: false, error: errorMessage }, { status: message === 'NOT_FOUND' ? 404 : 409 })
  }
}
