import {
  LeadAssignmentDepartment,
  LeadMeetingEventType,
  LeadStage,
  LeadSubStatus,
  Prisma,
} from '@/generated/prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

function toOptionalString(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toBooleanParam(value: string | null, fallback = false): boolean {
  const normalized = toOptionalString(value)?.toLowerCase()
  if (!normalized) return fallback
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const isAdmin = actorDepartments.has('ADMIN')
    const isSeniorCrm = actorDepartments.has('SR_CRM')
    const isVisualizer = actorDepartments.has('VISUALIZER_3D')

    if (!isAdmin && !isSeniorCrm && !isVisualizer) {
      return NextResponse.json(
        { success: false, error: 'Only Admin, Senior CRM, or 3D Visualizer users can access this queue' },
        { status: 403 },
      )
    }

    const searchParams = request.nextUrl.searchParams
    const search = toOptionalString(searchParams.get('search'))
    const queueTypeParam = toOptionalString(searchParams.get('queueType'))?.toLowerCase()
    const legacyCadApprovedOnly = toBooleanParam(searchParams.get('cadApprovedOnly'))
    const queueType: 'cad' | 'meeting' | 'budget' =
      queueTypeParam === 'meeting' || queueTypeParam === 'budget' || queueTypeParam === 'cad'
        ? queueTypeParam
        : legacyCadApprovedOnly
          ? 'meeting'
          : 'cad'

    const phaseScope: Prisma.LeadWhereInput = queueType === 'meeting'
      ? {
          OR: [
            {
              stage: LeadStage.CAD_PHASE,
              subStatus: LeadSubStatus.CAD_APPROVED,
            },
            {
              stage: LeadStage.DISCOVERY,
              subStatus: LeadSubStatus.FIRST_MEETING_SET,
              cadWorkSubmissions: { some: {} },
            },
            {
              stage: LeadStage.DISCOVERY,
              subStatus: LeadSubStatus.PROPOSAL_SENT,
              cadWorkSubmissions: { some: {} },
            },
          ],
        }
      : queueType === 'budget'
        ? {
            OR: [
              {
                stage: LeadStage.QUOTATION_PHASE,
                subStatus: {
                  in: [
                    LeadSubStatus.QUOTATION_ASSIGNED,
                    LeadSubStatus.QUOTATION_WORKING,
                    LeadSubStatus.QUOTATION_APPROVED,
                  ],
                },
              },
              {
                stage: LeadStage.BUDGET_PHASE,
                subStatus: LeadSubStatus.BUDGET_MEETING_SET,
              },
            ],
          }
        : {
          stage: LeadStage.CAD_PHASE,
        }

    const searchScope: Prisma.LeadWhereInput | null = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
          ],
        }
      : null

    const srScope: Prisma.LeadWhereInput =
      isSeniorCrm && !isAdmin
        ? {
            assignments: {
              some: {
                department: LeadAssignmentDepartment.SR_CRM,
                userId: authResult.actorUserId,
              },
            },
          }
        : {}

    const where: Prisma.LeadWhereInput = {
      AND: [phaseScope, srScope, ...(searchScope ? [searchScope] : [])],
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      include: {
        assignments: {
          where: {
                department: {
                  in: [
                LeadAssignmentDepartment.VISUALIZER_3D,
                LeadAssignmentDepartment.SR_CRM,
                LeadAssignmentDepartment.QUOTATION,
              ],
            },
          },
          include: {
            user: {
        select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        meetingEvents: {
          where: { type: LeadMeetingEventType.FIRST_MEETING },
          select: {
            id: true,
            title: true,
            startsAt: true,
            notes: true,
          },
          orderBy: { startsAt: 'desc' },
          take: 1,
        },
        visits: {
          where: { status: 'COMPLETED' },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          select: {
            assignedTo: {
              select: {
                id: true,
                fullName: true,
              },
            },
            supportAssignments: {
              select: {
                supportUser: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: leads.map((lead) => {
        const jrArchitectAssignment =
          lead.assignments.find((item) => item.department === LeadAssignmentDepartment.VISUALIZER_3D) ?? null
        const srCrmAssignment =
          lead.assignments.find((item) => item.department === LeadAssignmentDepartment.SR_CRM) ?? null
        const quotationAssignment =
          lead.assignments.find((item) => item.department === LeadAssignmentDepartment.QUOTATION) ?? null

        return {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          location: lead.location,
          stage: lead.stage,
          subStatus: lead.subStatus,
          updatedAt: lead.updated_at,
          budget: lead.budget,
          jrArchitectAssignment,
          srCrmAssignment,
          quotationAssignment,
          latestCompletedVisit: lead.visits[0]
            ? {
                assignedVisitLead: lead.visits[0].assignedTo ?? null,
                supportMembers: (lead.visits[0].supportAssignments ?? []).map((row) => row.supportUser),
              }
            : null,
          latestFirstMeeting: lead.meetingEvents[0] ?? null,
          canSetMeeting:
            (lead.stage === LeadStage.CAD_PHASE && lead.subStatus === LeadSubStatus.CAD_APPROVED) ||
            (lead.stage === LeadStage.QUOTATION_PHASE && lead.subStatus === LeadSubStatus.QUOTATION_APPROVED),
          canSubmitMeetingData:
            lead.stage === LeadStage.DISCOVERY && lead.subStatus === LeadSubStatus.FIRST_MEETING_SET,
          canReassignJrArchitect:
            !(
              lead.subStatus === LeadSubStatus.CAD_APPROVED ||
              lead.stage === LeadStage.DISCOVERY ||
              lead.stage === LeadStage.QUOTATION_PHASE
            ),
          canReassignQuotation:
            lead.stage === LeadStage.QUOTATION_PHASE &&
            (lead.subStatus === LeadSubStatus.QUOTATION_ASSIGNED ||
              lead.subStatus === LeadSubStatus.QUOTATION_WORKING ||
              lead.subStatus === LeadSubStatus.QUOTATION_CORRECTION),
        }
      }),
    })
  } catch (error) {
    console.error('[cad-work/visualizer-queue][GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch CAD queue' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, OPTIONS',
    },
  })
}
