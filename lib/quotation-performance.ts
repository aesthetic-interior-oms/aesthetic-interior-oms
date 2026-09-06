import prisma from '@/lib/prisma'
import { LeadAssignmentDepartment, LeadStage, LeadSubStatus } from '@/generated/prisma/client'
import { calculateLeadQuotationSqftSummary } from '@/lib/quotation-sqft-calculator'

export function getMonthKey(date: Date = new Date()): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

const MONTH_KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

export function normalizeMonthKey(monthKey?: string | null, fallbackDate: Date = new Date()): string {
  if (monthKey && MONTH_KEY_PATTERN.test(monthKey)) {
    return monthKey
  }
  return getMonthKey(fallbackDate)
}

export function getMonthDateRange(monthKeyOrDate: string | Date = new Date()) {
  const monthKey = typeof monthKeyOrDate === 'string' ? normalizeMonthKey(monthKeyOrDate) : getMonthKey(monthKeyOrDate)
  const [yyyy, mm] = monthKey.split('-').map(Number)
  const startDate = new Date(yyyy, mm - 1, 1, 0, 0, 0, 0)
  const nextMonthStart = new Date(yyyy, mm, 1, 0, 0, 0, 0)
  const endDate = new Date(nextMonthStart.getTime() - 1)

  return { monthKey, startDate, nextMonthStart, endDate }
}

type PerformanceDraft = {
  id: string
  draftKey: string
  createdById?: string | null
  updatedById?: string | null
  projectSqft?: number | null
  content?: unknown
  updatedAt: Date
}

export type QuotationPerformanceProject = {
  leadId: string
  leadName: string
  stage: string
  subStatus: string | null
  assignedAt: Date | null
  completedAt: Date | null
  detailSqft: number
  shortSqft: number
  totalSqft: number
  detailVersionsCount: number
  shortPackagesCount: number
  workingHours: number
  updatedAt: Date
}

function isCompletedForQuotationPerformance(lead: { stage: LeadStage; subStatus: LeadSubStatus | null }) {
  return (
    lead.subStatus === LeadSubStatus.QUOTATION_COMPLETED ||
    lead.subStatus === LeadSubStatus.QUOTATION_APPROVED ||
    lead.stage === LeadStage.BUDGET_PHASE ||
    lead.stage === LeadStage.VISUALIZATION_PHASE ||
    lead.stage === LeadStage.CONVERSION
  )
}

function matchesBaseDraftKey(draftKey: string, baseDraftKey: string) {
  if (baseDraftKey === 'detail' || baseDraftKey === 'detail:slot:1') {
    return (
      draftKey === 'detail' ||
      draftKey === 'detail:slot:1' ||
      draftKey.startsWith('detail:owner:') ||
      draftKey.startsWith('detail:slot:1:owner:')
    )
  }
  return draftKey === baseDraftKey || draftKey.startsWith(`${baseDraftKey}:owner:`)
}

function isOwnedDraftKey(draftKey: string, ownerUserId: string) {
  return draftKey.endsWith(`:owner:${ownerUserId}`)
}

export function pickVisibleQuotationDraftsForUser<T extends PerformanceDraft>(drafts: T[], ownerUserId: string): T[] {
  const baseKeys = [
    'detail',
    'detail:slot:2',
    'detail:slot:3',
    'short:platinum',
    'short:premium',
    'short:luxury',
  ]
  const picked = new Map<string, T>()

  for (const baseKey of baseKeys) {
    const matches = drafts
      .filter((draft) => matchesBaseDraftKey(draft.draftKey, baseKey))
      .sort((first, second) => second.updatedAt.getTime() - first.updatedAt.getTime())
    const owned = matches.find((draft) => isOwnedDraftKey(draft.draftKey, ownerUserId))
    const authoredBase = matches.find(
      (draft) =>
        draft.draftKey === baseKey &&
        (draft.createdById === ownerUserId || draft.updatedById === ownerUserId),
    )
    const base = matches.find((draft) => draft.draftKey === baseKey)
    const fallback = matches[0]
    const selected = owned ?? authoredBase ?? base ?? fallback

    if (selected) {
      picked.set(selected.id, selected)
    }
  }

  return Array.from(picked.values())
}

export async function listQuotationUserPerformanceProjects(userId: string, targetDate: Date = new Date()) {
  const { startDate, nextMonthStart } = getMonthDateRange(targetDate)
  const monthRange = { gte: startDate, lt: nextMonthStart }

  const assignedLeads = await prisma.lead.findMany({
    where: {
      assignments: {
        some: {
          department: LeadAssignmentDepartment.QUOTATION,
          userId,
          createdAt: monthRange,
        },
      },
    },
    select: {
      id: true,
      name: true,
      stage: true,
      subStatus: true,
      updated_at: true,
      visits: {
        select: { projectSqft: true, status: true },
        orderBy: { scheduledAt: 'desc' },
      },
      assignments: {
        where: {
          department: LeadAssignmentDepartment.QUOTATION,
          userId,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
      quotationDrafts: {
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          draftKey: true,
          createdById: true,
          updatedById: true,
          projectSqft: true,
          content: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { updated_at: 'desc' },
  })

  return assignedLeads.map((lead): QuotationPerformanceProject => {
    const visibleDrafts = pickVisibleQuotationDraftsForUser(lead.quotationDrafts, userId)
    const completedVisitSqft = lead.visits.find((v) => v.status === 'COMPLETED' && v.projectSqft)?.projectSqft ?? null
    const anyVisitSqft = lead.visits.find((v) => v.projectSqft)?.projectSqft ?? null
    const fallbackSqft = Number(completedVisitSqft ?? anyVisitSqft ?? 0)
    const sqftSummary = calculateLeadQuotationSqftSummary(visibleDrafts, 0)
    const detailSqft = sqftSummary.detailVersionsCount > 0 ? sqftSummary.avgDetailSqft : 0
    const shortSqft = sqftSummary.shortPackagesCount > 0 ? sqftSummary.avgShortSqft : 0
    const assignedAt = lead.assignments[0]?.createdAt ?? null
    const completedAt = isCompletedForQuotationPerformance(lead) ? lead.updated_at : null
    const workingHours =
      assignedAt && completedAt
        ? Number(Math.max(0.5, (completedAt.getTime() - assignedAt.getTime()) / (1000 * 60 * 60)).toFixed(1))
        : 0

    return {
      leadId: lead.id,
      leadName: lead.name,
      stage: lead.stage,
      subStatus: lead.subStatus,
      assignedAt,
      completedAt,
      detailSqft,
      shortSqft,
      totalSqft: detailSqft + shortSqft,
      detailVersionsCount: sqftSummary.detailVersionsCount,
      shortPackagesCount: sqftSummary.shortPackagesCount,
      workingHours,
      updatedAt: lead.updated_at,
    }
  })
}

/**
 * Calculates and persists monthly quotation performance for a specific user.
 * Can be triggered automatically on quotation work submit, draft save, or approval.
 */
export async function recalculateQuotationUserPerformance(userId: string, targetDate: Date = new Date()) {
  const { monthKey } = getMonthDateRange(targetDate)
  const projects = await listQuotationUserPerformanceProjects(userId, targetDate)
  const detailSqft = projects.reduce((sum, project) => sum + project.detailSqft, 0)
  const shortSqft = projects.reduce((sum, project) => sum + project.shortSqft, 0)
  const completedProjects = projects.filter((project) => project.completedAt)
  const completedCount = completedProjects.length
  const totalWorkingHoursSum = completedProjects.reduce((sum, project) => sum + project.workingHours, 0)

  console.log(`[QuotationPerformance] User ${userId} has ${projects.length} quotation assignments in ${monthKey}.`)

  const totalSqft = detailSqft + shortSqft
  console.log(`[QuotationPerformance] User ${userId} FINAL -> Total detail: ${detailSqft}, Total short: ${shortSqft}, Completed count: ${completedCount}`)
  const avgWorkingHours = completedCount > 0 ? Number((totalWorkingHoursSum / completedCount).toFixed(1)) : 0

  // Score calculation out of 100:
  // - Volume (SQFT): up to 50 pts (10,000 sqft = 50 pts)
  // - Completed Count: up to 30 pts (10 completed = 30 pts)
  // - Speed: up to 20 pts (under 24h avg = 20 pts)
  const sqftScore = Math.min(50, (totalSqft / 10000) * 50)
  const countScore = Math.min(30, (completedCount / 10) * 30)
  const speedScore = completedCount > 0 ? Math.min(20, Math.max(5, 20 - (avgWorkingHours / 24) * 5)) : 0
  const performanceScore = Number(Math.min(100, Math.round(sqftScore + countScore + speedScore)).toFixed(1))

  try {
    const record = await prisma.quotationUserPerformance.upsert({
      where: {
        userId_monthKey: { userId, monthKey },
      },
      create: {
        userId,
        monthKey,
        detailSqft,
        shortSqft,
        totalSqft,
        completedCount,
        avgWorkingHours,
        performanceScore,
      },
      update: {
        detailSqft,
        shortSqft,
        totalSqft,
        completedCount,
        avgWorkingHours,
        performanceScore,
      },
    })

    return record
  } catch (err) {
    console.error(`[QuotationPerformance] Failed to upsert for user ${userId}:`, err)
    return {
      id: `fallback-${userId}-${monthKey}`,
      userId,
      monthKey,
      detailSqft,
      shortSqft,
      totalSqft,
      completedCount,
      avgWorkingHours,
      performanceScore,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
}

/**
 * Syncs performance records for all members of the Quotation team for a specific month.
 */
export async function syncAllQuotationTeamPerformance(targetDate: Date = new Date()) {
  const quotationUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        {
          userDepartments: {
            some: {
              department: {
                name: { in: ['QUOTATION_TEAM', 'QUOTATION', 'Quotation Team', 'Quotation'], mode: 'insensitive' },
              },
            },
          },
        },
        {
          leadAssignments: {
            some: {
              department: LeadAssignmentDepartment.QUOTATION,
            },
          },
        },
        {
          quotationDraftsCreated: {
            some: {},
          },
        },
        {
          quotationDraftsUpdated: {
            some: {},
          },
        },
      ],
    },
    select: { id: true },
  })

  const results = await Promise.all(
    quotationUsers.map((u) => recalculateQuotationUserPerformance(u.id, targetDate)),
  )
  return results
}
