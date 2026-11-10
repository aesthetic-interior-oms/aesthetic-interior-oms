import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

export const dynamic = 'force-dynamic'

function generateRequisitionNo(prefix = 'ELEC') {
  const ts = Date.now().toString(36).toUpperCase()
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${ts}-${rnd}`
}

/**
 * GET /api/electrician/requisitions
 * Lists electrical requisitions created by the current user.
 */
export async function GET() {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const requisitions = await prisma.materialRequisition.findMany({
      where: { createdById: authResult.actorUserId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        lead: { select: { id: true, name: true, location: true } },
        items: { select: { id: true, materialName: true, unit: true, finalQuantity: true } },
      },
    })

    return NextResponse.json({ success: true, data: { requisitions } })
  } catch (error) {
    console.error('[electrician/requisitions][GET]', error)
    return NextResponse.json({ success: false, error: 'Failed to load requisitions' }, { status: 500 })
  }
}

/**
 * POST /api/electrician/requisitions
 * Creates a new electrical material requisition.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const body = await request.json().catch(() => ({})) as Record<string, unknown>

    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : ''
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Project (leadId) is required' }, { status: 400 })
    }

    const rawItems = Array.isArray(body.items) ? body.items : []
    if (rawItems.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one material item is required' }, { status: 400 })
    }

    // Verify lead exists
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } })
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    // Build unique requisition number
    let requisitionNo = generateRequisitionNo()
    // ensure uniqueness with retry
    for (let i = 0; i < 5; i++) {
      const existing = await prisma.materialRequisition.findUnique({ where: { requisitionNo } })
      if (!existing) break
      requisitionNo = generateRequisitionNo()
    }

    const requisition = await prisma.materialRequisition.create({
      data: {
        leadId,
        requisitionNo,
        status: 'SUBMITTED',
        createdById: authResult.actorUserId,
        notes: typeof body.notes === 'string' ? body.notes.trim() : null,
        items: {
          create: rawItems.map((item: Record<string, unknown>) => ({
            materialName: typeof item.materialName === 'string' ? item.materialName.slice(0, 240) : 'Unnamed',
            specifications: typeof item.specifications === 'string' ? item.specifications.slice(0, 1000) : null,
            netQuantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
            finalQuantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
            wastagePercent: 0,
            unit: typeof item.unit === 'string' && item.unit.trim() ? item.unit.trim() : 'Pcs',
            workCategory: 'ELECTRICAL_WORK',
            remarks: typeof item.remarks === 'string' ? item.remarks.slice(0, 500) : null,
          })),
        },
      },
      include: {
        lead: { select: { id: true, name: true } },
        items: true,
      },
    })

    return NextResponse.json({ success: true, data: { requisition } }, { status: 201 })
  } catch (error) {
    console.error('[electrician/requisitions][POST]', error)
    return NextResponse.json({ success: false, error: 'Failed to create requisition' }, { status: 500 })
  }
}
