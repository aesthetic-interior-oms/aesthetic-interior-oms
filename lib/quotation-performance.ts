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
      const shortDrafts = lead.quotationDrafts.filter((d) => d.draftKey.startsWith('short:'))

      let leadDetailSqft = 0
      let leadShortSqft = 0

      if (detailDraft) {
        let extractedSqft = detailDraft.projectSqft ?? 0
        if (extractedSqft <= 0 && detailDraft.content && typeof detailDraft.content === 'object') {
          const contentObj = detailDraft.content as any
          if (Array.isArray(contentObj.lineItems)) {
            // Note: Line items in detail quotations contain individual material sqft, which may overstate project sqft
            // if summed directly, but we use it as a last-resort fallback if projectSqft wasn't explicitly entered.
            extractedSqft = contentObj.lineItems
              .filter((item: any) => item.included && (item.unit === 'sqft' || item.unit === 'sft'))
              .reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0)
          }
        }
        leadDetailSqft = extractedSqft > 0 ? extractedSqft : fallbackSqft
      }

      if (shortDrafts.length > 0) {
        for (const shortDraft of shortDrafts) {
          let extractedSqft = shortDraft.projectSqft ?? 0
          if (extractedSqft <= 0 && shortDraft.content && typeof shortDraft.content === 'object') {
            const contentObj = shortDraft.content as any
            if (Array.isArray(contentObj.rooms)) {
              for (const room of contentObj.rooms) {
                if (Array.isArray(room.lines)) {
                  extractedSqft += room.lines
                    .reduce((sum: number, line: any) => sum + (Number(line.quantitySqft) || 0), 0)
                }
              }
            }
          }
          // Note: If multiple short packages are created for the same lead, 
          // we only count the SQFT once, using the max among packages to prevent artificially inflating performance.
          const draftSqft = extractedSqft > 0 ? extractedSqft : fallbackSqft
          if (draftSqft > leadShortSqft) {
            leadShortSqft = draftSqft
          }
        }
      }

      if (!detailDraft && shortDrafts.length === 0 && fallbackSqft > 0) {
        leadDetailSqft = fallbackSqft
      }

      detailSqft += leadDetailSqft
      shortSqft += leadShortSqft
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
