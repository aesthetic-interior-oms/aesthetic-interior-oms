import { NextResponse } from 'next/server'

import { VisitStatus } from '@/generated/prisma/client'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'

type VisitPerformanceRow = {
  id: string
  name: string
  totalVisits: number
  completed: number
  reportCompleteness: number
  deepData: number
  performance: number
  leadVisits: number
  supportVisits: number
}

const VISIT_DASHBOARD_DEPARTMENTS = new Set(['ADMIN', 'VISIT_TEAM'])

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getDeepDataScore(visit: Awaited<ReturnType<typeof loadMonthlyVisits>>[number]) {
  const resultFields = [
    visit.result?.summary,
    visit.result?.measurements,
    visit.result?.clientMood,
    visit.result?.clientPotentiality,
    visit.result?.projectType,
    visit.result?.clientPersonality,
    visit.result?.budgetRange,
    visit.result?.timelineUrgency,
    visit.result?.stylePreference,
    visit.result?.files?.length,
    visit.projectSqft,
    visit.projectStatus,
    visit.notes,
  ]
  const supportDepth = visit.supportResults.reduce((sum, result) => {
    return sum + [result.projectArea, result.projectStatus, result.extraConcern].filter(Boolean).length
  }, 0)
  return resultFields.filter(Boolean).length + supportDepth
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
      projectSqft: true,
      projectStatus: true,
      notes: true,
      assignedTo: { select: { id: true, fullName: true } },
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
          projectArea: true,
          projectStatus: true,
          extraConcern: true,
        },
      },
      result: {
        select: {
          id: true,
          summary: true,
          measurements: true,
          clientMood: true,
          clientPotentiality: true,
          projectType: true,
          clientPersonality: true,
          budgetRange: true,
          timelineUrgency: true,
          stylePreference: true,
          files: { select: { id: true } },
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

    const canViewDashboardPerformance = (actor?.userDepartments ?? []).some((row) =>
      VISIT_DASHBOARD_DEPARTMENTS.has(row.department.name),
    )

    if (!canViewDashboardPerformance) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view visit dashboard performance' },
        { status: 403 },
      )
    }

    const visits = await loadMonthlyVisits()
    const memberMap = new Map<string, VisitPerformanceRow & { reportCount: number; deepSum: number }>()
    const ensureMember = (id: string, name: string) => {
      const current = memberMap.get(id) ?? {
        id,
        name,
        totalVisits: 0,
        completed: 0,
        reportCompleteness: 0,
        deepData: 0,
        performance: 0,
        leadVisits: 0,
        supportVisits: 0,
        reportCount: 0,
        deepSum: 0,
      }
      memberMap.set(id, current)
      return current
    }

    for (const visit of visits) {
      const depth = getDeepDataScore(visit)
      const hasLeadReport = Boolean(visit.result || visit.supportResults.length || visit.supportAssignments.some((assignment) => assignment.result))

      if (visit.assignedTo) {
        const row = ensureMember(visit.assignedTo.id, visit.assignedTo.fullName)
        row.totalVisits += 1
        row.leadVisits += 1
        if (visit.status === VisitStatus.COMPLETED) row.completed += 1
        if (hasLeadReport) row.reportCount += 1
        row.deepSum += depth
      }

      for (const assignment of visit.supportAssignments) {
        const row = ensureMember(assignment.supportUserId, assignment.supportUser.fullName)
        row.totalVisits += 1
        row.supportVisits += 1
        if (assignment.result || visit.status === VisitStatus.COMPLETED) row.completed += 1
        if (assignment.result || visit.supportResults.some((result) => result.supportUserId === assignment.supportUserId)) row.reportCount += 1
        row.deepSum += depth
      }
    }

    const maxVisitsDone = Math.max(1, ...Array.from(memberMap.values()).map((row) => row.completed))
    const members = Array.from(memberMap.values()).map((row) => {
      const reportCompleteness = row.totalVisits ? Math.round((row.reportCount / row.totalVisits) * 100) : 0
      const completionRate = row.totalVisits ? row.completed / row.totalVisits : 0
      const volumeScore = row.completed / maxVisitsDone
      const deepData = row.totalVisits ? Math.min(100, Math.round((row.deepSum / row.totalVisits / 13) * 100)) : 0
      const performance = Math.min(100, Math.round((completionRate * 35) + (reportCompleteness * 0.25) + (deepData * 0.25) + (volumeScore * 15)))
      return {
        id: row.id,
        name: row.name,
        totalVisits: row.totalVisits,
        completed: row.completed,
        leadVisits: row.leadVisits,
        supportVisits: row.supportVisits,
        reportCompleteness,
        deepData,
        performance,
      }
    }).sort((first, second) => second.performance - first.performance || second.completed - first.completed)

    const currentUserPerformance = members.find((member) => member.id === authResult.actorUserId) ?? null
    const averagePerformance = members.length
      ? Math.round(members.reduce((sum, member) => sum + member.performance, 0) / members.length)
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
    return NextResponse.json({ success: false, error: 'Failed to load visit dashboard performance' }, { status: 500 })
  }
}
