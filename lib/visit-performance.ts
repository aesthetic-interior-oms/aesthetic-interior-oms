/**
 * Shared visit team performance calculation.
 *
 * Rules (unified):
 *  - totalSqft       : sum of visit projectSqft credited to the lead owner and support members
 *  - reportCount     : visit.result OR supportResults.length > 0 OR any support assignment has result (visit-team approach – broader)
 *  - performance     : (completionRate × 35) + (reportCompleteness × 0.25) + (sqftScore × 0.25) + (volumeScore × 15)
 */

import { VisitStatus } from '@/generated/prisma/client'
import { getMonthDateRange } from '@/lib/quotation-performance'
import prisma from '@/lib/prisma'

// ── Types ──────────────────────────────────────────────────────────────────

export type VisitForPerformance = {
  status: VisitStatus
  projectSqft: number | null
  assignedTo: { id: string; fullName: string } | null
  result: { id: string } | null
  supportAssignments: Array<{
    supportUserId: string
    supportUser: { id: string; fullName: string }
    result: { id: string } | null
  }>
  supportResults: Array<{
    supportUserId: string
  }>
}

export type VisitPerformanceRow = {
  id: string
  name: string
  totalVisits: number
  completed: number
  leadVisits: number
  supportVisits: number
  reportCompleteness: number
  totalSqft: number
  avgSqft: number
  performance: number
}

// ── Core calculation ───────────────────────────────────────────────────────

export function calculateVisitTeamPerformance(
  visits: VisitForPerformance[],
): VisitPerformanceRow[] {
  type MemberAccum = {
    id: string
    name: string
    totalVisits: number
    completed: number
    reportCount: number
    leadVisits: number
    supportVisits: number
    totalSqft: number
  }

  const memberMap = new Map<string, MemberAccum>()

  const ensureMember = (id: string, name: string): MemberAccum => {
    const current = memberMap.get(id) ?? {
      id,
      name,
      totalVisits: 0,
      completed: 0,
      reportCount: 0,
      leadVisits: 0,
      supportVisits: 0,
      totalSqft: 0,
    }
    memberMap.set(id, current)
    return current
  }

  for (const visit of visits) {
    const projectSqft = Number(visit.projectSqft ?? 0)
    const sqft = Number.isFinite(projectSqft) && projectSqft > 0 ? projectSqft : 0

    // reportCount input: visit team approach (broader check)
    const hasReport = Boolean(
      visit.result ||
        visit.supportResults.length > 0 ||
        visit.supportAssignments.some((a) => a.result),
    )

    // Lead owner
    if (visit.assignedTo) {
      const row = ensureMember(visit.assignedTo.id, visit.assignedTo.fullName)
      row.totalVisits += 1
      row.leadVisits += 1
      if (visit.status === VisitStatus.COMPLETED) row.completed += 1
      if (hasReport) row.reportCount += 1
      row.totalSqft += sqft
    }

    // Support members
    for (const assignment of visit.supportAssignments) {
      const row = ensureMember(
        assignment.supportUserId,
        assignment.supportUser.fullName,
      )
      row.totalVisits += 1
      row.supportVisits += 1
      if (assignment.result || visit.status === VisitStatus.COMPLETED)
        row.completed += 1
      if (
        assignment.result ||
        visit.supportResults.some(
          (r) => r.supportUserId === assignment.supportUserId,
        )
      )
        row.reportCount += 1
      row.totalSqft += sqft
    }
  }

  const maxCompleted = Math.max(
    1,
    ...Array.from(memberMap.values()).map((r) => r.completed),
  )
  const maxTotalSqft = Math.max(
    1,
    ...Array.from(memberMap.values()).map((r) => r.totalSqft),
  )

  return Array.from(memberMap.values())
    .map((row) => {
      const completionRate = row.totalVisits ? row.completed / row.totalVisits : 0
      const sqftScore = row.totalSqft ? (row.totalSqft / maxTotalSqft) * 100 : 0
      const reportCompleteness = row.totalVisits
        ? Math.round((row.reportCount / row.totalVisits) * 100)
        : 0
      const volumeScore = row.completed / maxCompleted
      const performance = Math.min(
        100,
        Math.round(
          completionRate * 35 +
            reportCompleteness * 0.25 +
            sqftScore * 0.25 +
            volumeScore * 15,
        ),
      )
      return {
        id: row.id,
        name: row.name,
        totalVisits: row.totalVisits,
        completed: row.completed,
        leadVisits: row.leadVisits,
        supportVisits: row.supportVisits,
        reportCompleteness,
        totalSqft: Number(row.totalSqft.toFixed(2)),
        avgSqft: row.totalVisits ? Math.round(row.totalSqft / row.totalVisits) : 0,
        performance,
      }
    })
    .sort(
      (a, b) =>
        b.performance - a.performance || b.completed - a.completed,
    )
}

export async function getMonthlyVisitTeamPerformance(monthKeyOrDate: string | Date = new Date()) {
  const { monthKey, startDate, nextMonthStart } = getMonthDateRange(monthKeyOrDate)

  const visits = await prisma.visit.findMany({
    where: { scheduledAt: { gte: startDate, lt: nextMonthStart } },
    select: {
      status: true,
      projectSqft: true,
      assignedTo: { select: { id: true, fullName: true } },
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

  return {
    monthKey,
    members: calculateVisitTeamPerformance(visits),
  }
}
