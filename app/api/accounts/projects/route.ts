import prisma from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) {
      return authResult.response
    }

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    if (!actorDepartments.has('ACCOUNTS') && !actorDepartments.has('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const projects = await prisma.lead.findMany({
      where: {
        agreementType: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        location: true,
        agreementType: true,
        agreementValue: true,
        accountStatus: true,
        transactions: {
          where: {
            type: 'INFLOW',
          },
          select: {
            amount: true,
          },
        },
        assignments: {
          where: {
            department: 'SR_CRM',
          },
          select: {
            user: {
              select: {
                fullName: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    })

    const data = projects.map((p) => {
      const paid = p.transactions.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0)
      const agreementValue = p.agreementValue ?? 0
      const due = agreementValue - paid
      return {
        id: p.id,
        name: p.name,
        location: p.location,
        agreementType: p.agreementType,
        agreementValue,
        accountStatus: p.accountStatus,
        paid,
        due,
        srCrmName: p.assignments[0]?.user?.fullName ?? 'Unassigned',
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[accounts/projects][GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 },
    )
  }
}
