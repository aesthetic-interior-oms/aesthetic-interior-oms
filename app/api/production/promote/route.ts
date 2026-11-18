import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import { isProductionHeadUser } from '@/lib/production-module'
import { promoteLeadToProduction } from '@/lib/production-workflow'
import { LeadStage } from '@/generated/prisma/client'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = authResult.actorRoles ?? []

    const isAuthorized =
      actorDepartments.has('ADMIN') ||
      actorDepartments.has('SR_CRM') ||
      isProductionHeadUser({ departments: actorDepartments, roles: actorRoles })

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only Admin, Senior CRM, Project Coordinator, or BOQ Team Leader can promote leads to Production.',
        },
        { status: 403 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const { leadId, preferredPcUserId, preferredBoqUserId, note, targetStage } = body

    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'leadId is required.' },
        { status: 400 },
      )
    }

    const validatedTargetStage =
      targetStage && Object.values(LeadStage).includes(targetStage) ? (targetStage as LeadStage) : undefined

    const result = await promoteLeadToProduction({
      leadId,
      actorUserId: authResult.actorUserId,
      preferredPcUserId,
      preferredBoqUserId,
      note,
      targetStage: validatedTargetStage,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[API /api/production/promote] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to promote lead to Production',
      },
      { status: 500 },
    )
  }
}
