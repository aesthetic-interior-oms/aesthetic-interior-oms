import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'

export const dynamic = 'force-dynamic'

function computeAutoStatus(paid: number, agreementValue: number): string {
  if (paid <= 0) return 'PENDING'
  if (paid < agreementValue) return 'PARTIAL_PAID'
  return 'FULL_PAID'
}

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

    // Auto-update statuses and build response data
    const statusUpdates: Promise<any>[] = []

    const data = projects.map((p) => {
      const paid = p.transactions.filter((t) => t.type === 'INFLOW').reduce((sum, t) => sum + t.amount, 0)
      const totalOutflow = p.transactions.filter((t) => t.type === 'OUTFLOW').reduce((sum, t) => sum + t.amount, 0)
      const agreementValue = p.agreementValue ?? 0
      const due = agreementValue - paid
      const profitMargin = agreementValue - totalOutflow

      // Auto-compute status based on payment progress
      const computedStatus = computeAutoStatus(paid, agreementValue)
      const currentStatus = p.accountStatus ?? 'PENDING'

      // Only auto-update if status differs AND is not a manual PROCESSING override
      // PROCESSING is always manually set; PENDING/PARTIAL_PAID/FULL_PAID are auto-managed
      if (currentStatus !== 'PROCESSING' && currentStatus !== computedStatus) {
        statusUpdates.push(
          prisma.lead.update({
            where: { id: p.id },
            data: { accountStatus: computedStatus as any },
          })
        )
      }

      const resolvedStatus = currentStatus === 'PROCESSING' ? 'PROCESSING' : computedStatus

      return {
        id: p.id,
        name: p.name,
        location: p.location,
        agreementType: p.agreementType,
        agreementValue,
        accountStatus: resolvedStatus,
        paid,
        due,
        totalOutflow,
        profitMargin,
        srCrmName: p.assignments[0]?.user?.fullName ?? 'Unassigned',
      }
    })

    // Fire-and-forget auto-status updates (non-blocking)
    if (statusUpdates.length > 0) {
      void Promise.all(statusUpdates).catch((err) =>
        console.error('[accounts/projects] Auto-status update error:', err)
      )
    }

    // Aggregate stats
    const totalReceived = data.reduce((sum, p) => sum + p.paid, 0)
    const totalAgreementValue = data.reduce((sum, p) => sum + p.agreementValue, 0)
    const totalReceivable = totalAgreementValue - totalReceived
    const totalPayable = data.reduce((sum, p) => sum + p.totalOutflow, 0)

    return NextResponse.json({
      success: true,
      data,
      stats: {
        totalReceived,
        totalReceivable,
        totalPayable,
        totalAgreementValue,
      },
    })
  } catch (error) {
    console.error('[accounts/projects][GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 },
    )
  }
}
