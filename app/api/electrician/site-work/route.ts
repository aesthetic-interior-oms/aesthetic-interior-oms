import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

export const dynamic = 'force-dynamic'

/**
 * GET /api/electrician/site-work
 * Returns site work logs created by the current electrician.
 */
export async function GET() {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const logs = await prisma.siteDeliveryLog.findMany({
      where: { receivedById: authResult.actorUserId },
      orderBy: { deliveryDate: 'desc' },
      take: 100,
      include: {
        lead: { select: { id: true, name: true, location: true, phone: true } },
        receivedBy: { select: { id: true, fullName: true } },
      },
    })

    return NextResponse.json({ success: true, data: { logs } })
  } catch (error) {
    console.error('[electrician/site-work][GET]', error)
    return NextResponse.json({ success: false, error: 'Failed to load site work logs' }, { status: 500 })
  }
}

/**
 * POST /api/electrician/site-work
 * Logs a new electrical site work entry.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const body = await request.json().catch(() => ({})) as Record<string, unknown>

    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : ''
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Project is required' }, { status: 400 })
    }

    const workSummary = typeof body.workSummary === 'string' ? body.workSummary.trim() : ''
    if (!workSummary) {
      return NextResponse.json({ success: false, error: 'Work summary is required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } })
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    // Reuse SiteDeliveryLog model — itemsSummary = work summary, challanNo = work ref
    const log = await prisma.siteDeliveryLog.create({
      data: {
        leadId,
        receivedById: authResult.actorUserId,
        itemsSummary: workSummary.slice(0, 1000),
        challanNo: typeof body.workRef === 'string' && body.workRef.trim() ? body.workRef.trim().slice(0, 80) : null,
        vendorName: 'ELECTRICAL_WORK', // sentinel to distinguish from material delivery logs
        notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : null,
        slipUrl: typeof body.photoUrl === 'string' && body.photoUrl.trim() ? body.photoUrl.trim() : null,
        condition: 'GOOD',
        deliveryDate: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: { log } }, { status: 201 })
  } catch (error) {
    console.error('[electrician/site-work][POST]', error)
    return NextResponse.json({ success: false, error: 'Failed to log site work' }, { status: 500 })
  }
}
