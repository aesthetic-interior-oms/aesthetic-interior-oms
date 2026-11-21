import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { LeadAssignmentDepartment, LeadStage } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/site-engineer/projects
 * Returns active site projects where agreement is completed.
 * Project Coordinator & Admin see all sites and can assign Site Engineers.
 * Downstream Site Engineers see only projects assigned to them.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = authResult.actorRoles ?? []
    const isAdmin =
      actorDepartments.has('ADMIN') ||
      actorRoles.some((r) => r.toUpperCase() === 'ADMIN')
    const isPc =
      actorDepartments.has('PROJECT_COORDINATOR') ||
      actorDepartments.has('PROJECT_CORDINATOR') ||
      actorRoles.some((r) => r.toUpperCase().includes('PROJECT_COORDINATOR'))
    const isSrCrm = actorDepartments.has('SR_CRM')

    const canManageAssignments = isAdmin || isPc || isSrCrm
    const isSiteEngineerLeaderOrAdmin = isAdmin || isPc

    // Filter strictly for Agreement Done / Production Ready projects
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
      ...(!isSiteEngineerLeaderOrAdmin
        ? {
            assignments: {
              some: {
                department: LeadAssignmentDepartment.SITE_ENGINEER,
                userId: authResult.actorUserId,
              },
            },
          }
        : {}),
    }

    // Fetch projects with related assignments, deliveries, POs, and quotation drafts
    const [leads, siteEngineersList] = await Promise.all([
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
          created_at: true,
          assignments: {
            where: {
              department: {
                in: [
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
              challanNo: true,
            },
            orderBy: { deliveryDate: 'desc' },
          },
          purchaseOrders: {
            select: {
              id: true,
              poNo: true,
              status: true,
              totalAmount: true,
              supplierName: true,
            },
          },
          quotationDrafts: {
            select: {
              id: true,
              content: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updated_at: 'desc' },
      }),
      // Fetch all eligible Site Engineers for the assignment dropdown
      canManageAssignments
        ? prisma.user.findMany({
            where: {
              isActive: true,
              userDepartments: {
                some: {
                  department: {
                    name: {
                      in: [
                        'SITE_ENGINEER',
                        'Site Engineer',
                        'Site_Engineer',
                        'Site Engineering',
                        'SITE_ENGINEERING',
                        'PROJECT_ENGINEER',
                      ],
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
                  department: LeadAssignmentDepartment.SITE_ENGINEER,
                },
                select: { id: true },
              },
            },
            orderBy: { fullName: 'asc' },
          })
        : Promise.resolve([]),
    ])

    // Format site engineers with active project counts
    const siteEngineers = (siteEngineersList as any[]).map((se) => ({
      id: se.id,
      fullName: se.fullName,
      email: se.email,
      phone: se.phone,
      activeProjectsCount: Array.isArray(se.leadAssignments) ? se.leadAssignments.length : 0,
    }))

    // Process and enrich projects
    let totalPurchased = 0
    let totalDeliveries = 0
    let unassignedCount = 0
    let inExecutionCount = 0

    const projects = leads.map((lead) => {
      const siteEngAssignment = lead.assignments.find(
        (a) => a.department === LeadAssignmentDepartment.SITE_ENGINEER,
      )
      const pcAssignment = lead.assignments.find(
        (a) => a.department === LeadAssignmentDepartment.PROJECT_COORDINATOR,
      )
      const srCrmAssignment = lead.assignments.find(
        (a) => a.department === LeadAssignmentDepartment.SR_CRM,
      )

      if (!siteEngAssignment) {
        unassignedCount++
      }
      if (lead.stage === LeadStage.SITE_EXECUTION) {
        inExecutionCount++
      }

      // Deliveries calculations
      const deliveries = lead.siteDeliveryLogs || []
      totalDeliveries += deliveries.length
      const deliveryIssues = deliveries.filter(
        (d) => d.condition === 'DAMAGED' || d.condition === 'REJECTED' || d.condition === 'PARTIAL',
      ).length
      const latestDeliveryDate = deliveries.length > 0 ? deliveries[0].deliveryDate : null

      // Purchase orders calculations
      const pos = lead.purchaseOrders || []
      const approvedPos = pos.filter((po) => po.status === 'APPROVED' || po.status === 'FULFILLED')
      const leadPurchasedAmount = approvedPos.reduce((sum, po) => sum + (po.totalAmount || 0), 0)
      totalPurchased += leadPurchasedAmount

      // Scope / BOQ Progress calculation
      let totalLineItems = 0
      let completedLineItems = 0
      const activeDraft = lead.quotationDrafts?.[0]
      if (activeDraft?.content && typeof activeDraft.content === 'object') {
        const content = activeDraft.content as Record<string, unknown>
        if (Array.isArray(content.lineItems)) {
          const items = content.lineItems.filter((i: any) => i && i.included !== false)
          totalLineItems = items.length
          completedLineItems = items.filter((i: any) => i.completed === true).length
        }
      }
      const progressPercent =
        totalLineItems > 0 ? Math.round((completedLineItems / totalLineItems) * 100) : 0

      return {
        id: lead.id,
        name: lead.name,
        location: lead.location,
        phone: lead.phone,
        stage: lead.stage,
        subStatus: lead.subStatus,
        agreementType: lead.agreementType,
        agreementValue: lead.agreementValue,
        created_at: lead.created_at,
        assignedSiteEngineer: siteEngAssignment?.user || null,
        assignedProjectCoordinator: pcAssignment?.user || null,
        assignedSrCrm: srCrmAssignment?.user || null,
        deliveriesSummary: {
          total: deliveries.length,
          issues: deliveryIssues,
          latestDate: latestDeliveryDate,
        },
        purchasedSummary: {
          totalPOs: pos.length,
          approvedPOs: approvedPos.length,
          totalAmount: leadPurchasedAmount,
        },
        scopeProgress: {
          total: totalLineItems,
          completed: completedLineItems,
          percent: progressPercent,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        projects,
        stats: {
          totalProjects: leads.length,
          unassignedCount,
          inExecutionCount,
          totalDeliveries,
          totalPurchased,
        },
        siteEngineers,
        canManageAssignments,
      },
    })
  } catch (error) {
    console.error('Error fetching site engineer projects:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    )
  }
}
