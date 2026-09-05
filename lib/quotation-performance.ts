import prisma from '@/lib/prisma'
import { LeadAssignmentDepartment, LeadStage, LeadSubStatus, Prisma } from '@/generated/prisma/client'
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

/**
 * Calculates and persists monthly quotation performance for a specific user.
 * Can be triggered automatically on quotation work submit, draft save, or approval.
 */
export async function recalculateQuotationUserPerformance(userId: string, targetDate: Date = new Date()) {
  const { monthKey, startDate, nextMonthStart } = getMonthDateRange(targetDate)
  const monthRange = { gte: startDate, lt: nextMonthStart }
  const monthDraftActivityWhere: Prisma.QuotationDraftWhereInput = {
    OR: [
      { createdById: userId, createdAt: monthRange },
      { updatedById: userId, updatedAt: monthRange },
    ],
  }

  // Fetch leads with quotation activity for this user inside the selected month.
  const assignedLeads = await prisma.lead.findMany({
    where: {
      OR: [
        {
          assignedTo: userId,
          updated_at: monthRange,
        },
        {
          primaryOwnerUserId: userId,
          updated_at: monthRange,
        },
        {
          assignments: {
            some: {
              userId,
              createdAt: monthRange,
            },
          },
        },
        {
          quotationDrafts: { some: monthDraftActivityWhere },
        },
        {
          AND: [
            {
              OR: [
                { assignedTo: userId },
                { primaryOwnerUserId: userId },
                { assignments: { some: { userId } } },
              ],
            },
            { subStatus: { in: [LeadSubStatus.QUOTATION_COMPLETED, LeadSubStatus.QUOTATION_APPROVED] } },
            { updated_at: monthRange },
          ],
        },
      ],
    },
    select: {
      id: true,
      stage: true,
      subStatus: true,
      updated_at: true,
      created_at: true,
      visits: {
        select: { projectSqft: true, status: true },
        orderBy: { scheduledAt: 'desc' },
      },
      quotationDrafts: {
        where: monthDraftActivityWhere,
        select: {
          draftKey: true,
          projectSqft: true,
          content: true,
          status: true,
          updatedAt: true,
          createdAt: true,
        },
      },
    },
  })

  let detailSqft = 0
  let shortSqft = 0
  let completedCount = 0
  let totalWorkingHoursSum = 0

  console.log(`[QuotationPerformance] User ${userId} has ${assignedLeads.length} leads assigned/drafted in quotation.`)

  for (const lead of assignedLeads) {
    const leadUpdatedAt = new Date(lead.updated_at)
    const isCompleted =
      leadUpdatedAt >= startDate &&
      leadUpdatedAt < nextMonthStart &&
      (lead.subStatus === LeadSubStatus.QUOTATION_COMPLETED ||
        lead.subStatus === LeadSubStatus.QUOTATION_APPROVED ||
        lead.stage === LeadStage.BUDGET_PHASE ||
        lead.stage === LeadStage.VISUALIZATION_PHASE ||
        lead.stage === LeadStage.CONVERSION)

    if (isCompleted) {
      completedCount += 1
      const startTime = new Date(lead.created_at).getTime()
      const endTime = new Date(lead.updated_at).getTime()
      const diffHours = Math.max(0.5, (endTime - startTime) / (1000 * 60 * 60))
      totalWorkingHoursSum += diffHours
    }

    // Always calculate SQFT per document type (averaging versions/packages) for all leads worked on
    // Prefer projectSqft from a COMPLETED visit; fall back to any visit that has a projectSqft value
    const completedVisitSqft = lead.visits.find((v) => v.status === 'COMPLETED' && v.projectSqft)?.projectSqft ?? null
    const anyVisitSqft = lead.visits.find((v) => v.projectSqft)?.projectSqft ?? null
    const fallbackSqft = Number(completedVisitSqft ?? anyVisitSqft ?? 0)
    const sqftSummary = calculateLeadQuotationSqftSummary(lead.quotationDrafts, fallbackSqft)

    const leadDetailSqft = sqftSummary.avgDetailSqft
    const leadShortSqft = sqftSummary.avgShortSqft

    if (lead.quotationDrafts.length > 0) {
      console.log(`[QuotationPerformance] Lead ${lead.id} fallbackSqft: ${fallbackSqft}, avgDetail: ${leadDetailSqft}, avgShort: ${leadShortSqft}`)
      detailSqft += leadDetailSqft
      shortSqft += leadShortSqft
    }
  }

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
