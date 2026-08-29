import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) {
      return authResult.response
    }

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    if (!actorDepartments.has('ACCOUNTS') && !actorDepartments.has('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    const whereClause: any = {
      agreementType: {
        not: null,
      },
    }

    if (month) {
      const [year, m] = month.split('-')
      const startDate = new Date(parseInt(year), parseInt(m) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(m), 0, 23, 59, 59, 999)
      whereClause.created_at = {
        gte: startDate,
        lte: endDate,
      }
    }

    const projects = await prisma.lead.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        location: true,
        agreementType: true,
        agreementValue: true,
        accountStatus: true,
        transactions: {
          select: {
            amount: true,
            type: true,
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
      const paid = p.transactions.filter((t) => t.type === 'INFLOW').reduce((sum, t) => sum + t.amount, 0)
      const totalOutflow = p.transactions.filter((t) => t.type === 'OUTFLOW').reduce((sum, t) => sum + t.amount, 0)
      const agreementValue = p.agreementValue ?? 0
      const due = agreementValue - paid
      const profitMargin = agreementValue - totalOutflow
      return {
        id: p.id,
        name: p.name,
        location: p.location,
        agreementType: p.agreementType,
        agreementValue,
        accountStatus: p.accountStatus,
        paid,
        due,
        totalOutflow,
        profitMargin,
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
