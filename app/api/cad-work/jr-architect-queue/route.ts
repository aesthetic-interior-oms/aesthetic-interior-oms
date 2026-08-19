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
import { hasJrArchitectureLeaderRole } from '@/lib/jr-architecture-roles'

function toOptionalString(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}


function isMissingOptionalRelationError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  const code = (error as { code?: unknown }).code
  return code === 'P2021' || code === 'P2022'
}

function toBooleanParam(value: string | null, fallback = false): boolean {
  const normalized = toOptionalString(value)?.toLowerCase()
  if (!normalized) return fallback
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

type QueueLead = Awaited<ReturnType<typeof fetchQueueLeads>>[number]

async function fetchQueueLeads(where: Prisma.LeadWhereInput, includeOptionalRelations: boolean) {
  return prisma.lead.findMany({
    where,
    orderBy: { updated_at: 'desc' },
    include: includeOptionalRelations
      ? {
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
              id: true,
              scheduledAt: true,
              projectSqft: true,
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
        }
      : {},
  })
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = authResult.actorRoles ?? []
    const isAdmin = actorDepartments.has('ADMIN')
    const isSeniorCrm = actorDepartments.has('SR_CRM')
    const isJrArchitectLeader =
      actorDepartments.has('JR_ARCHITECT') && hasJrArchitectureLeaderRole(actorRoles)

    if (!isAdmin && !isSeniorCrm && !isJrArchitectLeader) {
      return NextResponse.json(
        { success: false, error: 'Only Admin, Senior CRM, or JR Architect leaders can access this queue' },
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

    let leads: QueueLead[]
    try {
      leads = await fetchQueueLeads(where, true)
    } catch (error) {
      if (
        isMissingOptionalRelationError(error)
      ) {
        console.warn('[cad-work/jr-architect-queue][GET] Optional queue relation missing, retrying without visits/meetings')
        leads = await fetchQueueLeads(where, false)
      } else {
        throw error
      }
    }

    const assignments = leads.length > 0
      ? await prisma.leadAssignment.findMany({
          where: {
            leadId: { in: leads.map((lead) => lead.id) },
            department: {
              in: [
                LeadAssignmentDepartment.JR_ARCHITECT,
                LeadAssignmentDepartment.SR_CRM,
                LeadAssignmentDepartment.QUOTATION,
              ],
            },
            user: { isActive: true },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        })
      : []

    const assignmentsByLeadId = new Map<string, typeof assignments>()
    for (const assignment of assignments) {
      const leadAssignments = assignmentsByLeadId.get(assignment.leadId) ?? []
      leadAssignments.push(assignment)
      assignmentsByLeadId.set(assignment.leadId, leadAssignments)
    }

    return NextResponse.json({
      success: true,
      data: leads.map((lead) => {
        const leadAssignments = assignmentsByLeadId.get(lead.id) ?? []
        const jrArchitectAssignment =
          leadAssignments.find((item) => item.department === LeadAssignmentDepartment.JR_ARCHITECT) ?? null
        const srCrmAssignment =
          leadAssignments.find((item) => item.department === LeadAssignmentDepartment.SR_CRM) ?? null
        const quotationAssignment =
          leadAssignments.find((item) => item.department === LeadAssignmentDepartment.QUOTATION) ?? null
        const latestCompletedVisit = 'visits' in lead ? lead.visits[0] : null
        const latestFirstMeeting = 'meetingEvents' in lead ? lead.meetingEvents[0] : null

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
          latestCompletedVisit: latestCompletedVisit
            ? {
                id: latestCompletedVisit.id,
                scheduledAt: latestCompletedVisit.scheduledAt,
                projectSqft: latestCompletedVisit.projectSqft,
                assignedVisitLead: latestCompletedVisit.assignedTo ?? null,
                supportMembers: (latestCompletedVisit.supportAssignments ?? []).map((row) => row.supportUser),
              }
            : null,
          latestFirstMeeting,
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
            lead.stage === LeadStage.QUOTATION_PHASE,
        }
      }),
    })
  } catch (error) {
    console.error('[cad-work/jr-architect-queue][GET] Error:', error)
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
