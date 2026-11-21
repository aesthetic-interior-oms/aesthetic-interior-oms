import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { LeadAssignmentDepartment, LeadStage, SiteDeliveryCondition } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/site-engineer/delivery
 * Returns delivery logs and active site projects.
 * Project Coordinator & Admin see all site projects.
 * Downstream Site Engineers only receive visibility after Project Coordinator assigns them.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = authResult.actorRoles ?? []
    const isAdmin = actorDepartments.has('ADMIN') || actorRoles.some((r) => r.toUpperCase() === 'ADMIN')
    const isPc =
      actorDepartments.has('PROJECT_COORDINATOR') ||
      actorDepartments.has('PROJECT_CORDINATOR') ||
      actorRoles.some((r) => r.toUpperCase().includes('PROJECT_COORDINATOR'))

    const isSiteEngineerLeaderOrAdmin = isAdmin || isPc

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const condition = searchParams.get('condition') as SiteDeliveryCondition | null

    const where: Record<string, unknown> = {}
    if (leadId) where.leadId = leadId
    if (condition && Object.values(SiteDeliveryCondition).includes(condition)) {
      where.condition = condition
    }

    // Downstream Site Engineers only see deliveries of projects assigned to them
    if (!isSiteEngineerLeaderOrAdmin) {
      where.lead = {
        assignments: {
          some: {
            department: LeadAssignmentDepartment.SITE_ENGINEER,
            userId: authResult.actorUserId,
          },
        },
      }
    }

    const [deliveries, projects, counts, purchaseOrders] = await Promise.all([
      prisma.siteDeliveryLog.findMany({
        where,
        orderBy: { deliveryDate: 'desc' },
        take: 100,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              location: true,
              phone: true,
            },
          },
          receivedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
      // Active project sites with Agreement Done: Project Coordinator sees all; downstream Site Engineer sees only assigned
      prisma.lead.findMany({
        where: {
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
        },
        select: {
          id: true,
          name: true,
          location: true,
          phone: true,
          stage: true,
        },
        orderBy: { name: 'asc' },
        take: 150,
      }),
      // Status aggregation
      prisma.siteDeliveryLog.groupBy({
        by: ['condition'],
        _count: { _all: true },
      }),
      // Active approved purchase orders waiting for delivery
      prisma.purchaseOrder.findMany({
        where: {
          ...(leadId ? { leadId } : {}),
          status: { in: ['APPROVED', 'FULFILLED'] },
          ...(!isSiteEngineerLeaderOrAdmin
            ? {
                lead: {
                  assignments: {
                    some: {
                      department: LeadAssignmentDepartment.SITE_ENGINEER,
                      userId: authResult.actorUserId,
                    },
                  },
                },
              }
            : {}),
        },
        include: {
          lead: { select: { id: true, name: true, location: true } },
          indent: {
            include: {
              items: {
                include: {
                  requisitionItem: { select: { materialName: true, unit: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const conditionCounts: Record<string, number> = {
      TOTAL: deliveries.length,
      GOOD: 0,
      PARTIAL: 0,
      DAMAGED: 0,
      REJECTED: 0,
    }

    counts.forEach((c: any) => {
      conditionCounts[c.condition] = c._count._all
    })

    return NextResponse.json({
      success: true,
      data: {
        deliveries,
        projects,
        counts: conditionCounts,
        purchaseOrders: purchaseOrders || [],
      },
    })
  } catch (error: unknown) {
    console.error('[GET /api/site-engineer/delivery] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch deliveries'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/site-engineer/delivery
 * Record a new material delivery received at project site.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actor = authResult.actor
    const body = await request.json()

    const {
      leadId,
      challanNo,
      vendorName,
      itemsSummary,
      quantity,
      unit,
      deliveryDate,
      condition = 'GOOD',
      slipUrl,
      notes,
    } = body

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: 'Project / Site selection is required' },
        { status: 400 },
      )
    }

    if (!itemsSummary || !itemsSummary.trim()) {
      return NextResponse.json(
        { success: false, error: 'Material items summary is required' },
        { status: 400 },
      )
    }

    const delivery = await prisma.siteDeliveryLog.create({
      data: {
        leadId,
        receivedById: actor.id,
        challanNo: challanNo?.trim() || null,
        vendorName: vendorName?.trim() || null,
        itemsSummary: itemsSummary.trim(),
        quantity: quantity ? Number(quantity) : null,
        unit: unit?.trim() || 'Pcs',
        deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
        condition: (condition as SiteDeliveryCondition) || SiteDeliveryCondition.GOOD,
        slipUrl: slipUrl?.trim() || null,
        notes: notes?.trim() || null,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: delivery,
      message: 'Site material delivery logged successfully',
    })
  } catch (error: unknown) {
    console.error('[POST /api/site-engineer/delivery] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to log delivery'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
