import prisma from '@/lib/prisma'
import { LeadPhaseTaskStatus } from '@/generated/prisma/client'

const WORK_BENCHMARK = 20
const SQFT_BENCHMARK = 70000
const AVG_HOURS_BENCHMARK = 48

/**
 * Calculates and updates the performance of a Junior Architect for a given month.
 * The formula distributes 100% across Work (40%), Sqft (40%), and Speed (20%).
 * 
 * @param userId - The ID of the Junior Architect
 * @param date - Any date within the month to calculate for
 */
export async function updateJrArchitectPerformance(userId: string, date: Date = new Date()) {
  const month = date.getUTCMonth() + 1
  const year = date.getUTCFullYear()
  const monthStr = month.toString().padStart(2, '0')
  const monthYear = `${year}-${monthStr}`

  // 1. Get all completed CAD tasks for this user in this month
  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate = new Date(Date.UTC(year, month, 1))

  const completedTasks = await prisma.leadPhaseTask.findMany({
    where: {
      assigneeUserId: userId,
      phaseType: 'CAD',
      status: LeadPhaseTaskStatus.COMPLETED,
      completedAt: {
        gte: startDate,
        lt: endDate,
      },
    },
    include: {
      sourceVisit: {
        select: { projectSqft: true },
      },
    },
  })

  // 2. Aggregate the stats
  let totalWork = 0
  let totalSqft = 0
  let totalTimeMinutes = 0

  for (const task of completedTasks) {
    totalWork += 1
    if (task.sourceVisit?.projectSqft) {
      totalSqft += task.sourceVisit.projectSqft
    }
    
    if (task.completedAt) {
      const started = task.startedAt.getTime()
      const completed = task.completedAt.getTime()
      const durationMs = completed - started
      // Only count positive duration in case of anomalies
      if (durationMs > 0) {
        totalTimeMinutes += Math.floor(durationMs / 60000)
      }
    }
  }

  // 3. Calculate Performance Score
  const avgMinutes = totalWork > 0 ? totalTimeMinutes / totalWork : 0
  const avgHours = avgMinutes / 60

  let workScore = 0
  let sqftScore = 0
  let speedScore = 0

  if (totalWork > 0) {
    workScore = (totalWork / WORK_BENCHMARK) * 40
    sqftScore = (totalSqft / SQFT_BENCHMARK) * 40
    speedScore = (AVG_HOURS_BENCHMARK / Math.max(1, avgHours)) * 20
  }

  const performanceScore = Number((workScore + sqftScore + speedScore).toFixed(2))

  // 4. Save to database
  await prisma.jrArchitectPerformance.upsert({
    where: {
      userId_monthYear: {
        userId,
        monthYear,
      },
    },
    create: {
      userId,
      monthYear,
      totalWork,
      totalSqft,
      totalTimeMinutes,
      performanceScore,
    },
    update: {
      totalWork,
      totalSqft,
      totalTimeMinutes,
      performanceScore,
    },
  })
}

