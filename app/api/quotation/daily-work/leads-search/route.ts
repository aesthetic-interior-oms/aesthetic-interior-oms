import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim() ?? ''

    if (!query) {
      // Return 10 recent leads assigned to user or recently active
      const recentLeads = await prisma.lead.findMany({
        where: {
          OR: [
            {
              assignments: {
                some: { userId: authResult.actorUserId },
              },
            },
            {
              quotationDrafts: {
                some: {
                  OR: [{ createdById: authResult.actorUserId }, { updatedById: authResult.actorUserId }],
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          clientId: true,
          phone: true,
          stage: true,
          subStatus: true,
          visits: {
            select: { projectSqft: true },
            orderBy: { scheduledAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updated_at: 'desc' },
        take: 10,
      })

      return NextResponse.json({
        success: true,
        leads: recentLeads.map((l) => ({
          id: l.id,
          name: l.name,
          clientId: l.clientId,
          phone: l.phone,
          stage: l.stage,
          subStatus: l.subStatus,
          defaultSqft: l.visits[0]?.projectSqft ?? 0,
        })),
      })
    }

    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { clientId: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        clientId: true,
        phone: true,
        stage: true,
        subStatus: true,
        visits: {
          select: { projectSqft: true },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updated_at: 'desc' },
      take: 15,
    })

    return NextResponse.json({
      success: true,
      leads: leads.map((l) => ({
        id: l.id,
        name: l.name,
        clientId: l.clientId,
        phone: l.phone,
        stage: l.stage,
        subStatus: l.subStatus,
        defaultSqft: l.visits[0]?.projectSqft ?? 0,
      })),
    })
  } catch (error) {
    console.error('[GET /api/quotation/daily-work/leads-search] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to search leads' },
      { status: 500 },
    )
  }
}
