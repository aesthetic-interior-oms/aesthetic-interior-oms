import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { LeadAssignmentDepartment, LeadStage } from '@/generated/prisma/client'
import { getDepartmentNameAliases } from '@/lib/department-normalization'

export const dynamic = 'force-dynamic'

/**
 * GET /api/electric-engineer/projects
 * Returns all ongoing site projects visible to the Project Coordinator,
 * along with assigned Electricians and eligible Electrician users for assignment.
 */
export async function GET() {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(
      (authResult.actor.userDepartments ?? []).map((d: unknown) =>
        typeof d === 'string' ? d.trim().toUpperCase().replace(/\s+/g, '_') : '',
      ),
    )
    const actorRoles = authResult.actorRoles ?? []
    const isAdmin =
      actorDepartments.has('ADMIN') ||
      actorRoles.some((r) => r.toUpperCase() === 'ADMIN')
    const isPc =
      actorDepartments.has('PROJECT_COORDINATOR') ||
      actorDepartments.has('PROJECT_CORDINATOR') ||
      actorRoles.some((r) => r.toUpperCase().includes('PROJECT_COORDINATOR'))
    const isElectricEngineer =
      actorDepartments.has('ELECTRIC_ENGINEER') ||
      actorDepartments.has('ELECTRICAL_ENGINEER') ||
      actorRoles.some((r) => r.toUpperCase().includes('ELECTRIC_ENGINEER'))

    if (!isAdmin && !isPc && !isElectricEngineer) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 },
      )
    }

    // Same ongoing site project criteria as Project Coordinator / Site Engineer portal
    const ongoingCondition = {
      OR: [
        { isSiteWorkActive: true },
        { siteWorkRequests: { some: { status: 'ACCEPTED' as const } } },
        { stage: { in: [LeadStage.SITE_EXECUTION, LeadStage.QUALITY_CHECK, LeadStage.HANDOVER] } },
        { siteDeliveryLogs: { some: {} } },
      ],
    }

    const agreementFilter = {
      stage: {
        notIn: [LeadStage.CLOSED, LeadStage.VISIT_CANCELLED],
      },
      OR: [
        { stage: LeadStage.CONVERSION },
        {
          stage: {
            in: [
              LeadStage.PROJECT_SETUP,
              LeadStage.MATERIAL_PLANNING,
              LeadStage.PROCUREMENT,
              LeadStage.SITE_EXECUTION,
              LeadStage.QUALITY_CHECK,
              LeadStage.HANDOVER,
            ],
          },
        },
        { agreementType: { not: null } },
        { agreementValue: { gt: 0 } },
      ],
    }

    const where = {
      ...agreementFilter,
      ...ongoingCondition,
    }

    const electricianAliases = getDepartmentNameAliases('ELECTRICIAN')

    const [leads, electriciansList] = await Promise.all([
      prisma.lead.findMany({
        where,
        select: {
          id: true,
          name: true,
          location: true,
          phone: true,
          stage: true,
          subStatus: true,
          agreementType: true,
          agreementValue: true,
          agreementSqft: true,
          budget: true,
          created_at: true,
          isSiteWorkActive: true,
          siteWorkStartedAt: true,
          siteWorkRequests: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              note: true,
              createdAt: true,
            },
          },
          assignments: {
            where: {
              department: {
                in: [
                  LeadAssignmentDepartment.ELECTRICIAN,
                  LeadAssignmentDepartment.SITE_ENGINEER,
                  LeadAssignmentDepartment.PROJECT_COORDINATOR,
                  LeadAssignmentDepartment.SR_CRM,
                ],
              },
            },
            select: {
              id: true,
              department: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          siteDeliveryLogs: {
            select: {
              id: true,
              deliveryDate: true,
              condition: true,
            },
            orderBy: { deliveryDate: 'desc' },
          },
          purchaseOrders: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
            },
          },
        },
        orderBy: { updated_at: 'desc' },
      }),
      prisma.user.findMany({
        where: {
          isActive: true,
          userDepartments: {
            some: {
              department: {
                name: {
                  in: electricianAliases,
                },
              },
            },
          },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          leadAssignments: {
            where: {
              department: LeadAssignmentDepartment.ELECTRICIAN,
            },
            select: { id: true },
          },
        },
        orderBy: { fullName: 'asc' },
      }),
    ])

    const electricians = electriciansList.map((el) => ({
      id: el.id,
      fullName: el.fullName,
      email: el.email,
      phone: el.phone,
      activeProjectsCount: el.leadAssignments.length,
    }))

    let unassignedElectricianCount = 0
    let inExecutionCount = 0

    const projects = leads.map((lead) => {
      const assignedElectricians = lead.assignments
        .filter((a) => a.department === LeadAssignmentDepartment.ELECTRICIAN)
        .map((a) => a.user)
      const assignedSiteEngineers = lead.assignments
        .filter((a) => a.department === LeadAssignmentDepartment.SITE_ENGINEER)
        .map((a) => a.user)
      const pcAssignment = lead.assignments.find(
        (a) => a.department === LeadAssignmentDepartment.PROJECT_COORDINATOR,
      )
      const srCrmAssignment = lead.assignments.find(
        (a) => a.department === LeadAssignmentDepartment.SR_CRM,
      )

      if (assignedElectricians.length === 0) {
        unassignedElectricianCount++
      }
      if (lead.stage === LeadStage.SITE_EXECUTION) {
        inExecutionCount++
      }

      const deliveries = lead.siteDeliveryLogs || []
      const deliveryIssues = deliveries.filter(
        (d) => d.condition === 'PARTIAL' || d.condition === 'DAMAGED' || d.condition === 'REJECTED',
      ).length

      const totalPOs = lead.purchaseOrders.length
      const totalAmount = lead.purchaseOrders.reduce(
        (sum, po) => sum + (Number(po.totalAmount) || 0),
        0,
      )

      return {
        id: lead.id,
        name: lead.name,
        location: lead.location,
        phone: lead.phone,
        stage: lead.stage,
        subStatus: lead.subStatus,
        agreementType: lead.agreementType,
        agreementValue: lead.agreementValue,
        agreementSqft: lead.agreementSqft,
        budget: lead.budget,
        created_at: lead.created_at,
        isSiteWorkActive: lead.isSiteWorkActive,
        siteWorkStartedAt: lead.siteWorkStartedAt,
        latestSiteWorkRequest: lead.siteWorkRequests?.[0] ?? null,
        assignedElectricians,
        assignedSiteEngineers,
        assignedProjectCoordinator: pcAssignment?.user ?? null,
        assignedSrCrm: srCrmAssignment?.user ?? null,
        deliveriesSummary: {
          total: deliveries.length,
          issues: deliveryIssues,
          latestDate: deliveries.length > 0 ? deliveries[0].deliveryDate : null,
        },
        purchasedSummary: {
          totalPOs,
          totalAmount,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        projects,
        electricians,
        summary: {
          totalProjects: projects.length,
          unassignedElectricianCount,
          assignedElectricianCount: projects.length - unassignedElectricianCount,
          inExecutionCount,
        },
      },
    })
  } catch (error) {
    console.error('[electric-engineer/projects][GET]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load ongoing site projects' },
      { status: 500 },
    )
  }
}
