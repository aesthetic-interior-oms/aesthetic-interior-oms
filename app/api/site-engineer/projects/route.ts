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

    const actorDepartments = new Set(
      (authResult.actor.userDepartments ?? []).map((d: any) =>
        typeof d === 'string' ? d.trim().toUpperCase().replace(/\s+/g, '_') : ''
      )
    )
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
    let totalDeliveries = 0
    let unassignedCount = 0
    let inExecutionCount = 0
    let overallTotalItems = 0
    let overallCompletedItems = 0

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

      // Purchase orders count (NO pricing/amounts exposed to Site Engineers)
      const pos = lead.purchaseOrders || []
      const approvedPos = pos.filter((po) => po.status === 'APPROVED' || po.status === 'FULFILLED')

      // Quotation Products & Scope Progress (STRICTLY NO PRICES, RATES, OR TOTAL AMOUNTS)
      let quotation = null
      let totalLineItems = 0
      let completedLineItems = 0
      const activeDraft = lead.quotationDrafts?.[0]

      if (activeDraft?.content && typeof activeDraft.content === 'object') {
        const content = activeDraft.content as Record<string, unknown>

        // Build Floor & Area maps for proper hierarchy
        const floorsMap = new Map<string, string>()
        if (Array.isArray(content.floors)) {
          content.floors.forEach((f: any) => {
            if (f && f.id && f.name) floorsMap.set(String(f.id), String(f.name))
          })
        }

        const areasMap = new Map<string, string>()
        const areaFloorMap = new Map<string, string>()
        if (Array.isArray(content.areas)) {
          content.areas.forEach((a: any) => {
            if (a && a.id) {
              const aId = String(a.id)
              if (a.name) areasMap.set(aId, String(a.name))
              if (a.floorId && floorsMap.has(String(a.floorId))) {
                areaFloorMap.set(aId, floorsMap.get(String(a.floorId))!)
              }
            }
          })
        }

        const sectionsMap = new Map<string, string>()
        if (Array.isArray(content.sections)) {
          content.sections.forEach((s: any) => {
            if (s && s.id && s.name) sectionsMap.set(String(s.id), String(s.name))
          })
        }

        const rawLineItems = Array.isArray(content.lineItems) ? (content.lineItems as any[]) : []
        const validItems = rawLineItems.filter((i) => i && i.included !== false)

        const sanitizedItems = validItems.map((item, idx) => {
          const aId = item.areaId ? String(item.areaId) : null
          const sId = item.sectionId ? String(item.sectionId) : null
          const areaName = (aId && areasMap.has(aId))
            ? areasMap.get(aId)!
            : (item.areaName ? String(item.areaName) : (item.room ? String(item.room) : null))
          const floorName = (aId && areaFloorMap.has(aId))
            ? areaFloorMap.get(aId)!
            : (item.floorName ? String(item.floorName) : (item.floor ? String(item.floor) : null))
          const sectionName = (sId && sectionsMap.has(sId))
            ? sectionsMap.get(sId)!
            : (item.sectionName ? String(item.sectionName) : null)

          return {
            id: String(item.id || `item-${idx}`),
            description: String(item.description || item.name || item.title || 'Work Product Item'),
            quantity: typeof item.quantity === 'number' ? item.quantity : (Number(item.quantity) || 1),
            unit: String(item.unit || 'sqft'),
            materials: item.materials ? String(item.materials) : (item.specifications ? String(item.specifications) : null),
            floorName,
            areaName,
            sectionName,
            completed: Boolean(item.completed),
          }
        })

        // If no lineItems found, check short quotation rooms
        if (sanitizedItems.length === 0 && Array.isArray(content.rooms)) {
          content.rooms.forEach((rm: any) => {
            const rFloor = (rm.floorId && floorsMap.has(String(rm.floorId)))
              ? floorsMap.get(String(rm.floorId))!
              : 'Main Floor'
            const rName = rm.name ? String(rm.name) : 'Room'
            const lines = Array.isArray(rm.lines) ? rm.lines : []

            lines.forEach((l: any, lIdx: number) => {
              sanitizedItems.push({
                id: String(l.id || `short-${lIdx}`),
                description: String(l.description || l.title || 'Work Item'),
                quantity: typeof l.quantity === 'number' ? l.quantity : (Number(l.quantity) || 1),
                unit: String(l.unit || 'sqft'),
                materials: l.materials ? String(l.materials) : null,
                floorName: rFloor,
                areaName: rName,
                sectionName: null,
                completed: Boolean(l.completed),
              })
            })
          })
        }

        totalLineItems = sanitizedItems.length
        completedLineItems = sanitizedItems.filter((i) => i.completed).length

        quotation = {
          draftId: activeDraft.id,
          totalItems: totalLineItems,
          completedItems: completedLineItems,
          progressPercent: totalLineItems > 0 ? Math.round((completedLineItems / totalLineItems) * 100) : 0,
          items: sanitizedItems,
        }
      }

      const progressPercent =
        totalLineItems > 0 ? Math.round((completedLineItems / totalLineItems) * 100) : 0

      overallTotalItems += totalLineItems
      overallCompletedItems += completedLineItems

      return {
        id: lead.id,
        name: lead.name,
        location: lead.location,
        phone: lead.phone,
        stage: lead.stage,
        subStatus: lead.subStatus,
        agreementType: lead.agreementType,
        agreementValue: null, // Strictly hidden from Site Engineers
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
        },
        scopeProgress: {
          total: totalLineItems,
          completed: completedLineItems,
          percent: progressPercent,
        },
        quotation,
      }
    })

    const overallProgressPercent =
      overallTotalItems > 0 ? Math.round((overallCompletedItems / overallTotalItems) * 100) : 0

    return NextResponse.json({
      success: true,
      data: {
        projects,
        stats: {
          totalProjects: leads.length,
          unassignedCount,
          inExecutionCount,
          totalDeliveries,
          overallCompletedItems,
          overallTotalItems,
          overallProgressPercent,
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
