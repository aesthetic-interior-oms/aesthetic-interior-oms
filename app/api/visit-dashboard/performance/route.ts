import { NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { calculateVisitTeamPerformance } from '@/lib/visit-performance'

const VISIT_DASHBOARD_DEPARTMENTS = new Set(['ADMIN', 'VISIT_TEAM'])

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

async function loadMonthlyVisits() {
  const now = new Date()
  return prisma.visit.findMany({
    where: {
      scheduledAt: {
        gte: startOfMonth(now),
        lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      },
    },
    select: {
      status: true,
      assignedTo: { select: { id: true, fullName: true } },
      // Lead stage depth — used as deepData input
      lead: { select: { stage: true, subStatus: true } },
      // Report presence — used for reportCount (visit team broader approach)
      result: { select: { id: true } },
      supportAssignments: {
        select: {
          supportUserId: true,
          supportUser: { select: { id: true, fullName: true } },
          result: { select: { id: true } },
        },
      },
      supportResults: {
        select: {
          supportUserId: true,
        },
      },
    },
  })
}

export async function GET() {
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

    const visits = await loadMonthlyVisits()
    const members = calculateVisitTeamPerformance(visits)

    const currentUserPerformance =
      members.find((m) => m.id === authResult.actorUserId) ?? null

    const averagePerformance = members.length
      ? Math.round(
          members.reduce((sum, m) => sum + m.performance, 0) / members.length,
        )
      : 0

    return NextResponse.json({
      success: true,
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
