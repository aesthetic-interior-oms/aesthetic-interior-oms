import { NextRequest, NextResponse } from 'next/server'
import {
  ActivityType,
  LeadAssignmentDepartment,
  LeadPhaseTaskStatus,
  LeadPhaseType,
  LeadStage,
  LeadSubStatus,
} from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { logActivity, logLeadSubStatusChanged } from '@/lib/activity-log-service'

const STARTABLE_SUBSTATUSES = new Set<LeadSubStatus>([
  LeadSubStatus.QUOTATION_ASSIGNED,
  LeadSubStatus.QUOTATION_CORRECTION,
])

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

async function resolveLeadId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params
  const id = resolvedParams?.id
  if (typeof id !== 'string') return null
  const trimmed = id.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const leadId = await resolveLeadId(context)
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
    }

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const isAdminOrSr = actorDepartments.has('ADMIN') || actorDepartments.has('SR_CRM')
    const isQuotation = actorDepartments.has('QUOTATION') || actorDepartments.has('QUOTATION_TEAM')
    if (!isAdminOrSr && !isQuotation) {
      return NextResponse.json(
        { success: false, error: 'Only assigned quotation team members, Senior CRM, or Admin can start quotation work' },
        { status: 403 },
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({
        where: {
          id: leadId,
          stage: LeadStage.QUOTATION_PHASE,
          subStatus: { in: Array.from(STARTABLE_SUBSTATUSES) },
          ...(isAdminOrSr
            ? {}
            : {
                assignments: {
                  some: {
                    department: LeadAssignmentDepartment.QUOTATION,
                    userId: authResult.actorUserId,
                  },
                },
              }),
        },
        select: {
          id: true,
          name: true,
          subStatus: true,
          assignments: {
            where: { department: LeadAssignmentDepartment.QUOTATION },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { userId: true },
          },
        },
      })

      if (!lead) throw new Error('LEAD_NOT_FOUND_OR_NOT_STARTABLE')

      const now = new Date()
      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: { subStatus: LeadSubStatus.QUOTATION_WORKING },
        select: { id: true, stage: true, subStatus: true },
      })

      await logLeadSubStatusChanged(tx, {
        leadId: lead.id,
        userId: authResult.actorUserId,
        from: lead.subStatus,
        to: LeadSubStatus.QUOTATION_WORKING,
        reason: 'Quotation team confirmed work start.',
      })

      const openTask = await tx.leadPhaseTask.findFirst({
        where: {
          leadId: lead.id,
          phaseType: LeadPhaseType.QUOTATION,
          status: { in: [LeadPhaseTaskStatus.OPEN, LeadPhaseTaskStatus.IN_REVIEW] },
        },
        select: { id: true, status: true },
      })

      if (openTask) {
        await tx.leadPhaseTask.update({
          where: { id: openTask.id },
          data: { status: LeadPhaseTaskStatus.OPEN, startedAt: now, completedAt: null, updatedAt: now },
        })
      } else {
        const dueAt = new Date(now)
        dueAt.setDate(dueAt.getDate() + 3)
        await tx.leadPhaseTask.create({
          data: {
            leadId: lead.id,
            phaseType: LeadPhaseType.QUOTATION,
            assigneeUserId: lead.assignments[0]?.userId ?? authResult.actorUserId,
            startedAt: now,
            dueAt,
            createdById: authResult.actorUserId,
          },
        })
      }

      await logActivity(tx, {
        leadId: lead.id,
        userId: authResult.actorUserId,
        type: ActivityType.NOTE,
        description: 'Quotation work started by quotation team.',
      })

      return updatedLead
    })

    return NextResponse.json({ success: true, data: result, message: 'Quotation work started' })
  } catch (error) {
    if (error instanceof Error && error.message === 'LEAD_NOT_FOUND_OR_NOT_STARTABLE') {
      return NextResponse.json(
        { success: false, error: 'Lead is not assigned to you or is not ready to start quotation work' },
        { status: 404 },
      )
    }
    console.error('[lead/:id/quotation-work/start][POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to start quotation work' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } })
}
