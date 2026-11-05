import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { SiteDeliveryCondition } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/site-engineer/delivery
 * Returns delivery logs and active site projects.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const condition = searchParams.get('condition') as SiteDeliveryCondition | null

    const where: Record<string, unknown> = {}
    if (leadId) where.leadId = leadId
    if (condition && Object.values(SiteDeliveryCondition).includes(condition)) {
      where.condition = condition
    }

    const [deliveries, projects, counts] = await Promise.all([
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
      // Active project sites
      prisma.lead.findMany({
        where: {
          stage: {
            notIn: ['CLOSED', 'VISIT_CANCELLED'],
          },
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
    ])

    const conditionCounts = {
      TOTAL: deliveries.length,
      GOOD: 0,
      PARTIAL: 0,
      DAMAGED: 0,
      REJECTED: 0,
    }

    counts.forEach((c) => {
      conditionCounts[c.condition] = c._count._all
    })

    return NextResponse.json({
      success: true,
      data: {
        deliveries,
        projects,
        counts: conditionCounts,
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
