/**
 * Shared visit team performance calculation.
 *
 * Rules (unified):
 *  - deepData INPUT  : lead pipeline stage depth (admin approach) → leadStageDepthPercent()
 *  - deepData FORMULA: Math.min(100, Math.round(deepSum / totalVisits))  (already 0-100 avg)
 *  - reportCount     : visit.result OR supportResults.length > 0 OR any support assignment has result (visit-team approach – broader)
 *  - performance     : (completionRate × 35) + (reportCompleteness × 0.25) + (deepData × 0.25) + (volumeScore × 15)
 */

import { LeadStage, LeadSubStatus, VisitStatus } from '@/generated/prisma/client'

// ── Types ──────────────────────────────────────────────────────────────────

export type VisitForPerformance = {
  status: VisitStatus
  assignedTo: { id: string; fullName: string } | null
  lead: { stage: LeadStage; subStatus: LeadSubStatus | null }
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
  deepData: number
  performance: number
}

// ── Lead stage depth (0–100) ───────────────────────────────────────────────

export function leadStageDepthPercent(
  stage: LeadStage,
  subStatus: LeadSubStatus | null,
): number {
  if (
    stage === LeadStage.CONVERSION ||
    subStatus === LeadSubStatus.CLIENT_CONFIRMED ||
    subStatus === LeadSubStatus.CLIENT_PARTIALLY_PAID ||
    subStatus === LeadSubStatus.CLIENT_FULL_PAID
  )
    return 100
  if (stage === LeadStage.VISUALIZATION_PHASE) return 90
  if (
    stage === LeadStage.BUDGET_PHASE ||
    subStatus === LeadSubStatus.BUDGET_MEETING_SET
  )
    return 75
  if (
    stage === LeadStage.QUOTATION_PHASE ||
    subStatus === LeadSubStatus.QUOTATION_ASSIGNED ||
    subStatus === LeadSubStatus.QUOTATION_WORKING ||
    subStatus === LeadSubStatus.QUOTATION_COMPLETED ||
    subStatus === LeadSubStatus.QUOTATION_APPROVED
  )
    return 65
  if (
    stage === LeadStage.CAD_PHASE ||
    subStatus === LeadSubStatus.CAD_ASSIGNED ||
    subStatus === LeadSubStatus.CAD_WORKING ||
    subStatus === LeadSubStatus.CAD_COMPLETED ||
    subStatus === LeadSubStatus.CAD_APPROVED
  )
    return 45
  if (
    stage === LeadStage.DISCOVERY ||
    subStatus === LeadSubStatus.FIRST_MEETING_SET ||
    subStatus === LeadSubStatus.PROPOSAL_SENT
  )
    return 35
  if (
    stage === LeadStage.VISIT_COMPLETED ||
    subStatus === LeadSubStatus.VISIT_COMPLETED
  )
    return 25
  if (
    stage === LeadStage.VISIT_PHASE ||
    stage === LeadStage.VISIT_SCHEDULED ||
    stage === LeadStage.VISIT_RESCHEDULED ||
    subStatus === LeadSubStatus.VISIT_SCHEDULED ||
    subStatus === LeadSubStatus.VISIT_RESCHEDULED
  )
    return 15
  return 0
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
    deepSum: number
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
      deepSum: 0,
    }
    memberMap.set(id, current)
    return current
  }

  for (const visit of visits) {
    // deepData input: lead pipeline stage depth (0-100)
    const depth = leadStageDepthPercent(visit.lead.stage, visit.lead.subStatus)

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
      row.deepSum += depth
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
      row.deepSum += depth
    }
  }

  const maxCompleted = Math.max(
    1,
    ...Array.from(memberMap.values()).map((r) => r.completed),
  )

  return Array.from(memberMap.values())
    .map((row) => {
      const completionRate = row.totalVisits ? row.completed / row.totalVisits : 0
      // deepData formula: simple average of stage depth (already 0-100), capped at 100
      const deepData = row.totalVisits
        ? Math.min(100, Math.round(row.deepSum / row.totalVisits))
        : 0
      const reportCompleteness = row.totalVisits
        ? Math.round((row.reportCount / row.totalVisits) * 100)
        : 0
      const volumeScore = row.completed / maxCompleted
      const performance = Math.min(
        100,
        Math.round(
          completionRate * 35 +
            reportCompleteness * 0.25 +
            deepData * 0.25 +
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
        deepData,
        performance,
      }
    })
    .sort(
      (a, b) =>
        b.performance - a.performance || b.completed - a.completed,
    )
}
