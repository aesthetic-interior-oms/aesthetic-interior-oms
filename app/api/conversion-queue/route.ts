import {
  LeadAssignmentDepartment,
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

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const isAdmin = actorDepartments.has('ADMIN')
    const isSeniorCrm = actorDepartments.has('SR_CRM')
    const isAccounts = actorDepartments.has('ACCOUNTS')

    if (!isAdmin && !isSeniorCrm && !isAccounts) {
      return NextResponse.json(
        { success: false, error: 'Only Admin, Senior CRM, or Accounts can access this queue' },
        { status: 403 },
      )
    }

    const searchParams = request.nextUrl.searchParams
    const search = toOptionalString(searchParams.get('search'))

    const searchScope: Prisma.LeadWhereInput | null = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
          ],
        }
      : null

    // SR CRM sees only their own leads; Admin/Accounts see all
    const srScope: Prisma.LeadWhereInput =
      isSeniorCrm && !isAdmin && !isAccounts
        ? {
            assignments: {
              some: {
                department: LeadAssignmentDepartment.SR_CRM,
                userId: authResult.actorUserId,
              },
            },
          }
        : {}

    const phaseScope: Prisma.LeadWhereInput = {
      stage: LeadStage.CONVERSION,
      subStatus: {
        in: [
          LeadSubStatus.CLIENT_CONFIRMED,
          LeadSubStatus.CLIENT_PARTIALLY_PAID,
          LeadSubStatus.CLIENT_FULL_PAID,
        ],
      },
    }

    const where: Prisma.LeadWhereInput = {
      AND: [phaseScope, srScope, ...(searchScope ? [searchScope] : [])],
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      include: {
        visits: {
          where: { status: 'COMPLETED' },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
          select: {
            id: true,
            scheduledAt: true,
            projectSqft: true,
            assignedTo: { select: { id: true, fullName: true } },
            supportAssignments: {
              select: { supportUser: { select: { id: true, fullName: true } } },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    })

    const assignments =
      leads.length > 0
        ? await prisma.leadAssignment.findMany({
            where: {
              leadId: { in: leads.map((l) => l.id) },
              department: {
                in: [
                  LeadAssignmentDepartment.SR_CRM,
                  LeadAssignmentDepartment.QUOTATION,
                ],
              },
              user: { isActive: true },
            },
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { id: true, fullName: true, email: true } },
            },
          })
        : []

    const assignmentsByLeadId = new Map<string, typeof assignments>()
    for (const assignment of assignments) {
      const arr = assignmentsByLeadId.get(assignment.leadId) ?? []
      arr.push(assignment)
      assignmentsByLeadId.set(assignment.leadId, arr)
    }

    return NextResponse.json({
      success: true,
      data: leads.map((lead) => {
        const leadAssignments = assignmentsByLeadId.get(lead.id) ?? []
        const srCrmAssignment =
          leadAssignments.find((a) => a.department === LeadAssignmentDepartment.SR_CRM) ?? null
        const quotationAssignment =
          leadAssignments.find((a) => a.department === LeadAssignmentDepartment.QUOTATION) ?? null
        const latestCompletedVisit = (lead as any).visits?.[0] ?? null

        return {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          location: lead.location,
          stage: lead.stage,
          subStatus: lead.subStatus,
          updatedAt: lead.updated_at,
          budget: lead.budget,
          srCrmAssignment,
          quotationAssignment,
          latestCompletedVisit: latestCompletedVisit
            ? {
                id: latestCompletedVisit.id,
                scheduledAt: latestCompletedVisit.scheduledAt,
                projectSqft: latestCompletedVisit.projectSqft,
                assignedVisitLead: latestCompletedVisit.assignedTo ?? null,
                supportMembers: (latestCompletedVisit.supportAssignments ?? []).map(
                  (row: any) => row.supportUser,
                ),
              }
            : null,
        }
      }),
    })
  } catch (error) {
    console.error('[conversion-queue][GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversion queue' },
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
