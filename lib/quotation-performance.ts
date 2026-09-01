import prisma from '@/lib/prisma'
import { LeadAssignmentDepartment, LeadStage, LeadSubStatus } from '@/generated/prisma/client'

export function getMonthKey(date: Date = new Date()): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

/**
 * Calculates and persists monthly quotation performance for a specific user.
 * Can be triggered automatically on quotation work submit, draft save, or approval.
 */
export async function recalculateQuotationUserPerformance(userId: string, targetDate: Date = new Date()) {
  const monthKey = getMonthKey(targetDate)

  const year = targetDate.getFullYear()
  const month = targetDate.getMonth()
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999)

  // Fetch all leads assigned to this user in QUOTATION department
  const assignedLeads = await prisma.lead.findMany({
    where: {
      assignments: {
        some: {
          department: LeadAssignmentDepartment.QUOTATION,
          userId,
        },
      },
      updated_at: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    select: {
      id: true,
      stage: true,
      subStatus: true,
      updated_at: true,
      created_at: true,
      visits: {
        select: { projectSqft: true },
        orderBy: { scheduledAt: 'desc' },
        take: 1,
      },
      quotationDrafts: {
        select: {
          draftKey: true,
          projectSqft: true,
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

  for (const lead of assignedLeads) {
    const isCompleted =
      lead.subStatus === LeadSubStatus.QUOTATION_COMPLETED ||
      lead.subStatus === LeadSubStatus.QUOTATION_APPROVED

    if (isCompleted) {
      completedCount += 1

      // Calculate working hours
      const startTime = new Date(lead.created_at).getTime()
      const endTime = new Date(lead.updated_at).getTime()
      const diffHours = Math.max(0.5, (endTime - startTime) / (1000 * 60 * 60))
      totalWorkingHoursSum += diffHours

      // Calculate SQFT per document type
      const fallbackSqft = lead.visits[0]?.projectSqft ?? 0

      const detailDraft = lead.quotationDrafts.find((d) => d.draftKey === 'detail')
      const shortDraft = lead.quotationDrafts.find((d) => d.draftKey.startsWith('short:'))

      if (detailDraft) {
        detailSqft += detailDraft.projectSqft ?? fallbackSqft
      }
      if (shortDraft) {
        shortSqft += shortDraft.projectSqft ?? fallbackSqft
      }
      if (!detailDraft && !shortDraft && fallbackSqft > 0) {
        detailSqft += fallbackSqft
      }
    }
  }

  const totalSqft = detailSqft + shortSqft
  const avgWorkingHours = completedCount > 0 ? Number((totalWorkingHoursSum / completedCount).toFixed(1)) : 0

  // Score calculation out of 100:
  // - Volume (SQFT): up to 50 pts (10,000 sqft = 50 pts)
  // - Completed Count: up to 30 pts (10 completed = 30 pts)
  // - Speed: up to 20 pts (under 24h avg = 20 pts)
  const sqftScore = Math.min(50, (totalSqft / 10000) * 50)
  const countScore = Math.min(30, (completedCount / 10) * 30)
  const speedScore = completedCount > 0 ? Math.min(20, Math.max(5, 20 - (avgWorkingHours / 24) * 5)) : 0
  const performanceScore = Number(Math.min(100, Math.round(sqftScore + countScore + speedScore)).toFixed(1))

  // Pre-calculated database upsert
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
}

/**
 * Syncs performance records for all members of the Quotation team for a specific month.
 */
export async function syncAllQuotationTeamPerformance(targetDate: Date = new Date()) {
  const quotationUsers = await prisma.user.findMany({
    where: {
      userDepartments: {
        some: {
          department: {
            name: { in: ['QUOTATION', 'QUOTATION_TEAM'] },
          },
        },
      },
    },
    select: { id: true },
  })

  const results = await Promise.all(
    quotationUsers.map((u) => recalculateQuotationUserPerformance(u.id, targetDate)),
  )
  return results
}
