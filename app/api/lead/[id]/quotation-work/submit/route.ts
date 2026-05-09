import { NextRequest, NextResponse } from 'next/server'
import {
  ActivityType,
  LeadAssignmentDepartment,
  LeadPhaseTaskStatus,
  LeadPhaseType,
  LeadStage,
  LeadSubStatus,
  NotificationType,
} from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { logActivity, logLeadSubStatusChanged } from '@/lib/activity-log-service'
import { ensureSeniorCrmAssignment } from '@/lib/lead-handoff'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

type SubmitQuotationBody = {
  note?: unknown
}

async function resolveLeadId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params
  const id = resolvedParams?.id
  if (typeof id !== 'string') return null
  const trimmed = id.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toRequiredString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const leadId = await resolveLeadId(context)
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid lead id' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as SubmitQuotationBody
    const note = toRequiredString(body.note)
    if (!note) {
      return NextResponse.json({ success: false, error: 'Quotation submission note is required' }, { status: 400 })
    }

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const isAdminOrSr = actorDepartments.has('ADMIN') || actorDepartments.has('SR_CRM')
    const isQuotation = actorDepartments.has('QUOTATION') || actorDepartments.has('QUOTATION_TEAM')
    if (!isAdminOrSr && !isQuotation) {
      return NextResponse.json(
        { success: false, error: 'Only assigned quotation team members, Senior CRM, or Admin can submit quotation work' },
        { status: 403 },
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({
        where: {
          id: leadId,
          stage: LeadStage.QUOTATION_PHASE,
          subStatus: LeadSubStatus.QUOTATION_WORKING,
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
            where: { department: { in: [LeadAssignmentDepartment.SR_CRM, LeadAssignmentDepartment.QUOTATION] } },
            select: { userId: true, department: true },
          },
        },
      })

      if (!lead) throw new Error('LEAD_NOT_FOUND_OR_NOT_WORKING')

      const now = new Date()
      const srAssignment = await ensureSeniorCrmAssignment({
        tx,
        leadId: lead.id,
        actorUserId: authResult.actorUserId,
      })

      const submission = await tx.cadWorkSubmission.create({
        data: {
          leadId: lead.id,
          submittedById: authResult.actorUserId,
          note,
        },
        select: { id: true },
      })

      await tx.leadPhaseTask.updateMany({
        where: {
          leadId: lead.id,
          phaseType: LeadPhaseType.QUOTATION,
          status: LeadPhaseTaskStatus.OPEN,
        },
        data: {
          status: LeadPhaseTaskStatus.IN_REVIEW,
          updatedAt: now,
        },
      })

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: { subStatus: LeadSubStatus.QUOTATION_COMPLETED },
        select: { id: true, stage: true, subStatus: true },
      })

      await logLeadSubStatusChanged(tx, {
        leadId: lead.id,
        userId: authResult.actorUserId,
        from: lead.subStatus,
        to: LeadSubStatus.QUOTATION_COMPLETED,
        reason: 'Quotation team submitted quotation work for Senior CRM review.',
      })

      await logActivity(tx, {
        leadId: lead.id,
        userId: authResult.actorUserId,
        type: ActivityType.NOTE,
        description: `Quotation work submitted for Senior CRM review. Note: ${note}`,
      })

      const adminUsers = await tx.user.findMany({
        where: { isActive: true, userDepartments: { some: { department: { name: 'ADMIN' } } } },
        select: { id: true },
      })
      const targetUserIds = Array.from(
        new Set([
          ...lead.assignments
            .filter((assignment) => assignment.department === LeadAssignmentDepartment.SR_CRM)
            .map((assignment) => assignment.userId),
          ...(srAssignment.userId ? [srAssignment.userId] : []),
          ...adminUsers.map((user) => user.id),
        ]),
      ).filter((userId) => userId !== authResult.actorUserId)

      if (targetUserIds.length > 0) {
        await tx.notification.createMany({
          data: targetUserIds.map((userId) => ({
            userId,
            leadId: lead.id,
            type: NotificationType.LEAD_ASSIGNED_TO_YOU,
            title: 'Quotation submitted for review',
            message: `${lead.name} quotation work is ready in Review Center.`,
            scheduledFor: now,
          })),
        })
      }

      return { lead: updatedLead, submissionId: submission.id }
    })

    return NextResponse.json(
      { success: true, data: result, message: 'Quotation submitted for Senior CRM review' },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'LEAD_NOT_FOUND_OR_NOT_WORKING') {
      return NextResponse.json(
        { success: false, error: 'Lead is not assigned to you or quotation work has not been started' },
        { status: 404 },
      )
    }
    console.error('[lead/:id/quotation-work/submit][POST] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit quotation work' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } })
}
