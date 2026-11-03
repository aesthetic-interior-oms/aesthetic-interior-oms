import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { LeadAssignmentDepartment, LeadStage, Prisma, VisitType } from '@/generated/prisma/client'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const searchParams = request.nextUrl.searchParams
    const search = toOptionalString(searchParams.get('search'))
    const status = toOptionalString(searchParams.get('status')) || 'ALL'
    const sdcId = toOptionalString(searchParams.get('sdcId'))

    // Base scope: leads that are partial workflow leads
    const partialLeadScope: Prisma.LeadWhereInput = {
      OR: [
        { stage: { in: [LeadStage.PARTIAL_VISIT_PHASE, LeadStage.PARTIAL_QUOTATION_PHASE] } },
        {
          assignments: {
            some: {
              department: LeadAssignmentDepartment.SPECIALIST_DESIGN_CONSULTANTS,
            },
          },
        },
        {
          visits: {
            some: {
              visitType: VisitType.PARTIAL_WORK_VISIT,
            },
          },
        },
      ],
    }

    // Additional filters
    const where: Prisma.LeadWhereInput = {
      ...partialLeadScope,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { location: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(sdcId && sdcId !== 'ALL'
        ? {
            assignments: {
              some: {
                userId: sdcId,
                department: LeadAssignmentDepartment.SPECIALIST_DESIGN_CONSULTANTS,
              },
            },
          }
        : {}),
      ...(status === 'SCHEDULED'
        ? {
            visits: {
              some: {
                visitType: VisitType.PARTIAL_WORK_VISIT,
                status: { in: ['SCHEDULED', 'RESCHEDULED'] },
              },
            },
          }
        : status === 'COMPLETED'
          ? {
              visits: {
                some: {
                  visitType: VisitType.PARTIAL_WORK_VISIT,
                  status: 'COMPLETED',
                },
              },
            }
          : status === 'NOT_SCHEDULED'
            ? {
                visits: {
                  none: {
                    visitType: VisitType.PARTIAL_WORK_VISIT,
                    status: { in: ['SCHEDULED', 'RESCHEDULED', 'COMPLETED'] },
                  },
                },
              }
            : {}),
    }

    const [leads, sdcDepartmentUsers] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          phone: true,
          location: true,
          budget: true,
          stage: true,
          subStatus: true,
          created_at: true,
          assignments: {
            where: {
              department: {
                in: [
                  LeadAssignmentDepartment.SPECIALIST_DESIGN_CONSULTANTS,
                  LeadAssignmentDepartment.JR_CRM,
                ],
              },
            },
            include: {
              user: {
                select: { id: true, fullName: true, email: true, phone: true },
              },
            },
          },
          visits: {
            where: { visitType: VisitType.PARTIAL_WORK_VISIT },
            orderBy: { scheduledAt: 'desc' },
            take: 1,
            select: {
              id: true,
              scheduledAt: true,
              status: true,
              location: true,
              notes: true,
              visitFee: true,
              projectSqft: true,
              projectStatus: true,
              assignedTo: {
                select: { id: true, fullName: true, email: true },
              },
            },
          },
          followUps: {
            orderBy: { followupDate: 'desc' },
            take: 1,
            select: {
              id: true,
              followupDate: true,
              status: true,
              notes: true,
              createdAt: true,
              assignedTo: {
                select: { id: true, fullName: true },
              },
            },
          },
        },
      }),
      prisma.userDepartment.findMany({
        where: { department: { name: 'SPECIALIST_DESIGN_CONSULTANTS' } },
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
    ])

    // Format leads data
    const formattedLeads = leads.map((lead) => {
      const sdcAssignment = lead.assignments.find(
        (a) => a.department === LeadAssignmentDepartment.SPECIALIST_DESIGN_CONSULTANTS,
      )
      const jrCrmAssignment = lead.assignments.find(
        (a) => a.department === LeadAssignmentDepartment.JR_CRM,
      )
      const latestVisit = lead.visits[0] ?? null
      const latestFollowUp = lead.followUps[0] ?? null

      return {
        id: lead.id,
        clientNumber: `PL-${lead.id.slice(-5).toUpperCase()}`,
        name: lead.name,
        phone: lead.phone ?? 'N/A',
        location: lead.location ?? 'N/A',
        budget: lead.budget,
        stage: lead.stage,
        subStatus: lead.subStatus,
        createdAt: lead.created_at.toISOString(),
        visit: latestVisit
          ? {
              id: latestVisit.id,
              scheduledAt: latestVisit.scheduledAt.toISOString(),
              status: latestVisit.status,
              location: latestVisit.location,
              notes: latestVisit.notes,
              visitFee: latestVisit.visitFee,
              assignedTo: latestVisit.assignedTo,
            }
          : null,
        lastFollowUp: latestFollowUp
          ? {
              id: latestFollowUp.id,
              followupDate: latestFollowUp.followupDate.toISOString(),
              status: latestFollowUp.status,
              notes: latestFollowUp.notes,
              assignedTo: latestFollowUp.assignedTo?.fullName ?? 'N/A',
            }
          : null,
        sdcAssignee: sdcAssignment?.user ?? latestVisit?.assignedTo ?? null,
        jrCrmAssignee: jrCrmAssignment?.user ?? null,
      }
    })

    const totalCount = formattedLeads.length
    const scheduledCount = formattedLeads.filter(
      (l) => l.visit && (l.visit.status === 'SCHEDULED' || l.visit.status === 'RESCHEDULED'),
    ).length
    const completedCount = formattedLeads.filter((l) => l.visit && l.visit.status === 'COMPLETED').length
    const notScheduledCount = formattedLeads.filter((l) => !l.visit || l.visit.status === 'CANCELLED').length

    const sdcUsers = sdcDepartmentUsers.map((d) => d.user)

    return NextResponse.json({
      success: true,
      data: formattedLeads,
      stats: {
        totalCount,
        scheduledCount,
        completedCount,
        notScheduledCount,
      },
      sdcUsers,
    })
  } catch (error) {
    console.error('[GET /api/crm/partial-leads] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partial leads' },
      { status: 500 },
    )
  }
}
