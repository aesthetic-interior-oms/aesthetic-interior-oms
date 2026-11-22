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

    // Strictly ongoing sites: site work started / active OR accepted request OR in site execution
    const ongoingCondition = {
      OR: [
        { isSiteWorkActive: true },
        { siteWorkRequests: { some: { status: 'ACCEPTED' as const } } },
        { stage: { in: [LeadStage.SITE_EXECUTION, LeadStage.QUALITY_CHECK, LeadStage.HANDOVER] } },
        { siteDeliveryLogs: { some: {} } },
      ],
    }

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
      ...ongoingCondition,
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
    const [leads, siteEngineersList, pendingRequestsCount] = await Promise.all([
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
              itemsSummary: true,
              quantity: true,
              unit: true,
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
              indent: {
                select: {
                  indentNo: true,
                  items: {
                    select: {
                      id: true,
                      quantity: true,
                      requisitionItem: {
                        select: {
                          materialName: true,
                          unit: true,
                        },
                      },
                    },
                  },
                },
              },
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
      // Fetch count of pending site work requests
      prisma.leadSiteWorkRequest.count({
        where: {
          status: 'PENDING',
        },
      }),
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
      const siteEngAssignments = lead.assignments.filter(
        (a) => a.department === LeadAssignmentDepartment.SITE_ENGINEER,
      )
      const assignedSiteEngineers = siteEngAssignments.map((a) => a.user)
      const siteEngAssignment = siteEngAssignments[0] || null
      const pcAssignment = lead.assignments.find(
        (a) => a.department === LeadAssignmentDepartment.PROJECT_COORDINATOR,
      )
      const srCrmAssignment = lead.assignments.find(
        (a) => a.department === LeadAssignmentDepartment.SR_CRM,
      )

      if (assignedSiteEngineers.length === 0) {
        unassignedCount++
      }
      if (lead.stage === LeadStage.SITE_EXECUTION) {
        inExecutionCount++
      }

      // Deliveries calculations
      const deliveries = lead.siteDeliveryLogs || []
      totalDeliveries += deliveries.length
      const goodDeliveries = deliveries.filter((d) => d.condition === 'GOOD').length
      const partialDeliveries = deliveries.filter((d) => d.condition === 'PARTIAL').length
      const damagedDeliveries = deliveries.filter((d) => d.condition === 'DAMAGED').length
      const rejectedDeliveries = deliveries.filter((d) => d.condition === 'REJECTED').length
      const deliveryIssues = partialDeliveries + damagedDeliveries + rejectedDeliveries
      const latestDeliveryDate = deliveries.length > 0 ? deliveries[0].deliveryDate : null
      const totalDeliveredQty = deliveries.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0)

      // Purchase orders calculations
      const pos = lead.purchaseOrders || []
      const completedPos = pos.filter((po) => po.status === 'FULFILLED')
      const approvedPos = pos.filter((po) => po.status === 'APPROVED' || po.status === 'FULFILLED')
      const pendingPos = pos.filter((po) => po.status === 'PENDING_ACCOUNTS_APPROVAL')
      const leadPurchasedAmount = approvedPos.reduce((sum, po) => sum + (po.totalAmount || 0), 0)
      totalPurchased += leadPurchasedAmount

      // Calculate purchased items & quantities from approved/fulfilled POs
      let totalPurchasedItemsCount = 0
      let totalPurchasedQty = 0
      for (const po of approvedPos) {
        if (po.indent?.items && Array.isArray(po.indent.items)) {
          for (const item of po.indent.items) {
            totalPurchasedItemsCount++
            totalPurchasedQty += Number(item.quantity) || 0
          }
        }
      }

      // Materials Comparison
      let comparisonStatus: 'NO_PURCHASES' | 'AWAITING_DELIVERY' | 'PARTIALLY_DELIVERED' | 'FULLY_DELIVERED' = 'NO_PURCHASES'
      let comparisonLabel = 'No POs Issued'
      let deliveryPercent = 0

      if (approvedPos.length === 0) {
        comparisonStatus = 'NO_PURCHASES'
        comparisonLabel = 'No POs Issued'
        deliveryPercent = 0
      } else if (deliveries.length === 0) {
        comparisonStatus = 'AWAITING_DELIVERY'
        comparisonLabel = 'Awaiting Delivery'
        deliveryPercent = 0
      } else {
        if (totalPurchasedQty > 0 && totalDeliveredQty > 0) {
          deliveryPercent = Math.min(100, Math.round((totalDeliveredQty / totalPurchasedQty) * 100))
        } else {
          const ratio = completedPos.length > 0
            ? (completedPos.length / approvedPos.length)
            : Math.min(1, deliveries.length / approvedPos.length)
          deliveryPercent = Math.min(100, Math.round(ratio * 100))
        }

        if (deliveryPercent >= 100 || (completedPos.length === approvedPos.length && completedPos.length > 0)) {
          comparisonStatus = 'FULLY_DELIVERED'
          comparisonLabel = 'Fully Delivered'
        } else {
          comparisonStatus = 'PARTIALLY_DELIVERED'
          comparisonLabel = `Partially Delivered (${deliveryPercent}%)`
        }
      }

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
        budget: lead.budget,
        created_at: lead.created_at,
        isSiteWorkActive: Boolean(lead.isSiteWorkActive),
        siteWorkStartedAt: lead.siteWorkStartedAt,
        latestSiteWorkRequest: lead.siteWorkRequests?.[0] || null,
        assignedSiteEngineer: siteEngAssignment?.user || null,
        assignedSiteEngineers,
        assignedProjectCoordinator: pcAssignment?.user || null,
        assignedSrCrm: srCrmAssignment?.user || null,
        quotationProductsCount: totalLineItems,
        deliveriesSummary: {
          total: deliveries.length,
          issues: deliveryIssues,
          goodCount: goodDeliveries,
          partialCount: partialDeliveries,
          damagedCount: damagedDeliveries,
          rejectedCount: rejectedDeliveries,
          totalQuantity: totalDeliveredQty,
          latestDate: latestDeliveryDate,
        },
        purchasedSummary: {
          totalPOs: pos.length,
          approvedPOs: approvedPos.length,
          completedPOs: completedPos.length,
          pendingPOs: pendingPos.length,
          totalAmount: leadPurchasedAmount,
          totalItemsCount: totalPurchasedItemsCount,
          totalQuantity: totalPurchasedQty,
        },
        scopeProgress: {
          total: totalLineItems,
          completed: completedLineItems,
          percent: progressPercent,
        },
        materialsComparison: {
          status: comparisonStatus,
          label: comparisonLabel,
          purchasedQty: totalPurchasedQty,
          deliveredQty: totalDeliveredQty,
          deliveryPercent,
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
          pendingRequestsCount,
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
