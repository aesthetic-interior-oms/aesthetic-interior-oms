/**
 * Shared visit team performance calculation with Behaviour and Attendance tracking.
 *
 * Rules:
 *  - totalSqft          : sum of visit projectSqft credited to the lead owner and support members
 *  - reportCount        : visit.result OR supportResults.length > 0 OR any support assignment has result
 *  - operationalScore   : (completionRate × 28) + (reportCompleteness × 0.20) + (sqftScore × 0.20) + (volumeScore × 12)  [Max: 80]
 *  - attendanceScore    : Math.max(0, 10 - absentDays × 2)  [Max: 10]
 *  - behaviourScore     : Points based on tag (Best: +10, Better: +5, Good: +2, Neutral: 0, Bad: -5, Worse: -10, Worst: -15)
 *  - performance (total): Math.max(0, Math.min(100, Math.round(operationalScore + attendanceScore + behaviourScore)))
 */

import { VisitStatus } from '@/generated/prisma/client'
import { getMonthDateRange } from '@/lib/quotation-performance'
import prisma from '@/lib/prisma'

export * from '@/lib/visit-performance-types'
import {
  MemberAssessmentData,
  VisitPerformanceRow,
  getBehaviourPointsForTag,
} from '@/lib/visit-performance-types'

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

// ── Core calculation ───────────────────────────────────────────────────────

export function calculateVisitTeamPerformance(
  visits: VisitForPerformance[],
  assessments?: Map<string, MemberAssessmentData>,
  registeredMembers?: Array<{ id: string; fullName: string }>,
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

  // Pre-populate any registered members of the department so everyone appears even if 0 visits
  if (registeredMembers?.length) {
    for (const mem of registeredMembers) {
      ensureMember(mem.id, mem.fullName)
    }
  }

  for (const visit of visits) {
    const projectSqft = Number(visit.projectSqft ?? 0)
    const sqft = Number.isFinite(projectSqft) && projectSqft > 0 ? projectSqft : 0

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

  const memberList = Array.from(memberMap.values())
  const maxCompleted = Math.max(
    1,
    ...memberList.map((r) => r.completed),
  )
  const maxTotalSqft = Math.max(
    1,
    ...memberList.map((r) => r.totalSqft),
  )

  return memberList
    .map((row) => {
      const completionRate = row.totalVisits ? row.completed / row.totalVisits : 0
      const sqftScore = row.totalSqft ? (row.totalSqft / maxTotalSqft) * 100 : 0
      const reportCompleteness = row.totalVisits
        ? Math.round((row.reportCount / row.totalVisits) * 100)
        : 0
      const volumeScore = row.completed / maxCompleted

      // Operational field work score (scaled to 80 points)
      const operationalScore = Math.round(
        completionRate * 28 +
          reportCompleteness * 0.20 +
          sqftScore * 0.20 +
          volumeScore * 12,
      )

      // Look up assessment
      const assessment = assessments?.get(row.id)
      const isEnabled = assessment ? assessment.isEnabled : true
      const absentDays = assessment ? assessment.absentDays : 0
      // Attendance score out of 10: 10 minus 2 points per absent day (min 0)
      const attendanceScore = assessment
        ? assessment.attendanceScore
        : Math.max(0, 10 - absentDays * 2)

      const behaviourTag = assessment?.behaviourTag ?? null
      const behaviourScore = assessment
        ? assessment.behaviourScore
        : getBehaviourPointsForTag(behaviourTag)
      const behaviourNote = assessment?.notes ?? null

      // Final score combining operational work + attendance mark + behaviour points
      // Clamped between 0 and 100
      const rawPerformance = operationalScore + attendanceScore + behaviourScore
      const performance = Math.max(0, Math.min(100, Math.round(rawPerformance)))

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
        absentDays,
        attendanceScore,
        behaviourTag,
        behaviourScore,
        behaviourNote,
        operationalScore,
        performance,
        isEnabled,
      }
    })
    .sort(
      (a, b) =>
        b.performance - a.performance || b.completed - a.completed,
    )
}

export async function getMonthlyVisitTeamPerformance(monthKeyOrDate: string | Date = new Date()) {
  const { monthKey, startDate, nextMonthStart } = getMonthDateRange(monthKeyOrDate)

  // 1. Fetch visits for this month
  const visitsPromise = prisma.visit.findMany({
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

  // 2. Fetch all members of Visit Team & Specialist Design Consultants
  const membersPromise = prisma.user.findMany({
    where: {
      isActive: true,
      userDepartments: {
        some: {
          department: {
            name: {
              in: ['VISIT_TEAM', 'SPECIALIST_DESIGN_CONSULTANTS'],
            },
          },
        },
      },
    },
    select: {
      id: true,
      fullName: true,
    },
  })

  // 3. Fetch monthly assessments for this monthKey
  const assessmentsPromise = prisma.visitMemberMonthlyAssessment.findMany({
    where: { monthKey },
    select: {
      userId: true,
      absentDays: true,
      attendanceScore: true,
      behaviourTag: true,
      behaviourScore: true,
      notes: true,
      isEnabled: true,
    },
  })

  const [visits, registeredMembers, assessmentRows] = await Promise.all([
    visitsPromise,
    membersPromise,
    assessmentsPromise,
  ])

  const assessmentsMap = new Map<string, MemberAssessmentData>()
  for (const row of assessmentRows) {
    assessmentsMap.set(row.userId, {
      absentDays: row.absentDays,
      attendanceScore: row.attendanceScore,
      behaviourTag: row.behaviourTag,
      behaviourScore: row.behaviourScore,
      notes: row.notes,
      isEnabled: row.isEnabled ?? true,
    })
  }

  return {
    monthKey,
    members: calculateVisitTeamPerformance(visits, assessmentsMap, registeredMembers),
  }
}
