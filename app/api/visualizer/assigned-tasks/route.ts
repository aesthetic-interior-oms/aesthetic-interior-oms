import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  LeadAssignmentDepartment,
  LeadStage,
  LeadSubStatus,
} from '@/generated/prisma/client'
import { requireDatabaseRoles } from '@/lib/authz'

export async function GET() {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const canView =
      actorDepartments.has('ADMIN') ||
      actorDepartments.has('SR_CRM') ||
      actorDepartments.has('VISUALIZER_3D') ||
      actorDepartments.has('3D_VISUALIZER')

    if (!canView) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Only 3D Visualizer, Senior CRM, or Admin can access assigned tasks',
        },
        { status: 403 },
      )
    }

    const leads = await prisma.lead.findMany({
      where: {
        stage: LeadStage.VISUALIZATION_PHASE,
        subStatus: {
          in: [
            LeadSubStatus.VISUAL_ASSIGNED,
            LeadSubStatus.VISUAL_WORKING,
            LeadSubStatus.VISUAL_CORRECTION,
          ],
        },
        ...(actorDepartments.has('ADMIN') || actorDepartments.has('SR_CRM')
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
      select: {
        id: true,
        name: true,
        phone: true,
        location: true,
        stage: true,
        subStatus: true,
        updated_at: true,
        budget: true,
        assignments: {
          where: { department: LeadAssignmentDepartment.VISUALIZER_3D },
          select: {
            user: { select: { id: true, fullName: true, email: true } },
          },
          take: 1,
        },
        attachments: {
          select: { id: true, fileName: true, url: true, fileType: true },
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
      },
      orderBy: { updated_at: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: leads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        location: lead.location,
        stage: lead.stage,
        subStatus: lead.subStatus,
        updatedAt: lead.updated_at,
        budget: lead.budget,
        visualizerAssignee: lead.assignments[0]?.user ?? null,
        attachments:
          lead.subStatus === LeadSubStatus.VISUAL_WORKING ||
          lead.subStatus === LeadSubStatus.VISUAL_COMPLETED
            ? lead.attachments
            : [],
        canStart:
          lead.stage === LeadStage.VISUALIZATION_PHASE &&
          (lead.subStatus === LeadSubStatus.VISUAL_ASSIGNED ||
            lead.subStatus === LeadSubStatus.VISUAL_CORRECTION),
        canSubmit:
          lead.stage === LeadStage.VISUALIZATION_PHASE &&
          lead.subStatus === LeadSubStatus.VISUAL_WORKING,
      })),
    })
  } catch (error) {
    console.error('[visualizer/assigned-tasks][GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load assigned visualizer tasks' },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, OPTIONS' },
  })
}
