import { NextRequest, NextResponse } from 'next/server'
import {
  ActivityType,
  LeadAssignmentDepartment,
  LeadStage,
  LeadSubStatus,
} from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import {
  logActivity,
  logLeadSubStatusChanged,
} from '@/lib/activity-log-service'

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
    if (!leadId)
      return NextResponse.json(
        { success: false, error: 'Invalid lead id' },
        { status: 400 },
      )

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const isAdminOrSr =
      actorDepartments.has('ADMIN') || actorDepartments.has('SR_CRM')
    const isVisualizer =
      actorDepartments.has('VISUALIZER_3D') ||
      actorDepartments.has('3D_VISUALIZER')
    if (!isAdminOrSr && !isVisualizer) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Only assigned 3D Visualizer, Senior CRM, or Admin can start visualizer work',
        },
        { status: 403 },
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findFirst({
        where: {
          id: leadId,
          stage: LeadStage.VISUALIZATION_PHASE,
          subStatus: {
            in: [
              LeadSubStatus.VISUAL_ASSIGNED,
              LeadSubStatus.VISUAL_CORRECTION,
            ],
          },
          ...(isAdminOrSr
            ? {}
            : {
                assignments: {
                  some: {
                    department: LeadAssignmentDepartment.VISUALIZER_3D,
                    userId: authResult.actorUserId,
                  },
                },
              }),
        },
        select: { id: true, subStatus: true },
      })

      if (!lead) throw new Error('LEAD_NOT_FOUND_OR_NOT_STARTABLE')

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: { subStatus: LeadSubStatus.VISUAL_WORKING },
        select: { id: true, stage: true, subStatus: true },
      })

      await logLeadSubStatusChanged(tx, {
        leadId: lead.id,
        userId: authResult.actorUserId,
        from: lead.subStatus,
        to: LeadSubStatus.VISUAL_WORKING,
        reason: '3D Visualizer confirmed work start.',
      })

      await logActivity(tx, {
        leadId: lead.id,
        userId: authResult.actorUserId,
        type: ActivityType.NOTE,
        description: '3D visualization work started by assigned visualizer.',
      })

      return updatedLead
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: '3D visualization work started',
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'LEAD_NOT_FOUND_OR_NOT_STARTABLE'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Lead is not assigned to you or is not ready to start visualization work',
        },
        { status: 404 },
      )
    }
    console.error('[lead/:id/visualizer-work/start][POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start visualization work' },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST, OPTIONS' },
  })
}
