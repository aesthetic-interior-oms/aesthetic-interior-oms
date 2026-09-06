import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      )
    }

    const url = new URL(req.url)
    const statsOnly = url.searchParams.get('stats') === 'true'

    // Find leads assigned to this user via PROJECT_COORDINATOR department
    const assignments = await prisma.leadAssignment.findMany({
      where: {
        userId: user.id,
        department: 'PROJECT_COORDINATOR',
      },
      select: { leadId: true },
    })

    const leadIds = assignments.map((a) => a.leadId)

    if (statsOnly) {
      const totalProjects = leadIds.length
      const activeProjects =
        leadIds.length > 0
          ? await prisma.lead.count({
              where: {
                id: { in: leadIds },
                stage: { not: 'CLOSED' },
              },
            })
          : 0
      return NextResponse.json({
        success: true,
        stats: { totalProjects, activeProjects },
      })
    }

    if (leadIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: {
        id: true,
        name: true,
        location: true,
        agreementType: true,
        agreementValue: true,
        stage: true,
        subStatus: true,
        created_at: true,
        assignments: {
          where: { department: 'SR_CRM' },
          select: { user: { select: { fullName: true } } },
          take: 1,
        },
        quotationDrafts: {
          where: { draftKey: { startsWith: 'detail' } },
          select: {
            id: true,
            draftKey: true,
            grandTotal: true,
            status: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    const data = leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      location: lead.location,
      agreementType: lead.agreementType,
      agreementValue: lead.agreementValue ?? 0,
      stage: lead.stage,
      subStatus: lead.subStatus,
      srCrmName: lead.assignments[0]?.user?.fullName ?? 'N/A',
      draftCount: lead.quotationDrafts.length,
      latestDraftGrandTotal: lead.quotationDrafts[0]?.grandTotal ?? 0,
      createdAt: lead.created_at,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[PC Projects API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 },
    )
  }
}
