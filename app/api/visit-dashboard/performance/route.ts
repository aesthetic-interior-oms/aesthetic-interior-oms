import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { getMonthlyVisitTeamPerformance } from '@/lib/visit-performance'
import { normalizeMonthKey } from '@/lib/quotation-performance'

const VISIT_DASHBOARD_DEPARTMENTS = new Set(['ADMIN', 'VISIT_TEAM'])

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actor = await prisma.user.findUnique({
      where: { id: authResult.actorUserId },
      select: {
        id: true,
        userDepartments: { select: { department: { select: { name: true } } } },
      },
    })

    const canViewDashboardPerformance = (actor?.userDepartments ?? []).some(
      (row) => VISIT_DASHBOARD_DEPARTMENTS.has(row.department.name),
    )

    if (!canViewDashboardPerformance) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view visit dashboard performance' },
        { status: 403 },
      )
    }

    const monthKey = normalizeMonthKey(request.nextUrl.searchParams.get('month'))
    const { members } = await getMonthlyVisitTeamPerformance(monthKey)

    const currentUserPerformance =
      members.find((m) => m.id === authResult.actorUserId) ?? null

    const averagePerformance = members.length
      ? Math.round(
          members.reduce((sum, m) => sum + m.performance, 0) / members.length,
        )
      : 0

    return NextResponse.json({
      success: true,
      monthKey,
      data: {
        topPerformer: members[0] ?? null,
        currentUserPerformance,
        averagePerformance,
      },
    })
  } catch (error) {
    console.error('[visit-dashboard/performance][GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load visit dashboard performance' },
      { status: 500 },
    )
  }
}
