import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { LeadAssignmentDepartment, Prisma } from '@/generated/prisma/client'
import { requireDatabaseRoles } from '@/lib/authz'
import { getMonthDateRange, normalizeMonthKey, syncAllQuotationTeamPerformance } from '@/lib/quotation-performance'

type QuotationPerformanceRecord = Prisma.QuotationUserPerformanceGetPayload<{
  include: {
    user: {
      select: {
        id: true
        fullName: true
        email: true
      }
    }
  }
}>

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const searchParams = request.nextUrl.searchParams
    const monthKey = normalizeMonthKey(searchParams.get('month'))

    // Parse target month date for syncing
    const { startDate: targetDate } = getMonthDateRange(monthKey)

    let lastError: string | null = null

    // Make sure all quotation team performance records exist and are up to date
    try {
      await syncAllQuotationTeamPerformance(targetDate)
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : String(err)
      console.error('[GET /api/quotation/performance] Sync error:', msg)
      lastError = `SyncError: ${msg}`
    }

    // Fetch pre-calculated performance records from database
    let performanceRecords: QuotationPerformanceRecord[] = []
    try {
      performanceRecords = await prisma.quotationUserPerformance.findMany({
        where: {
          monthKey,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          performanceScore: 'desc',
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : String(err)
      console.error('[GET /api/quotation/performance] findMany error:', msg)
      if (!lastError) lastError = `FindManyError: ${msg}`
    }

    // Fetch all active quotation team members to ensure everyone is listed even if 0 activity
    const teamMembers = await prisma.user.findMany({
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
          {
            id: authResult.actorUserId,
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    })

    const recordMap = new Map(performanceRecords.map((r) => [r.userId, r]))

    const fullLeaderboard = teamMembers.map((member) => {
      const perf = recordMap.get(member.id)
      return {
        userId: member.id,
        fullName: member.fullName,
        email: member.email,
        detailSqft: perf?.detailSqft ?? 0,
        shortSqft: perf?.shortSqft ?? 0,
        totalSqft: perf?.totalSqft ?? 0,
        completedCount: perf?.completedCount ?? 0,
        avgWorkingHours: perf?.avgWorkingHours ?? 0,
        performanceScore: perf?.performanceScore ?? 0,
        updatedAt: perf?.updatedAt ?? null,
      }
    })

    // Sort by performance score descending
    fullLeaderboard.sort((a, b) => b.performanceScore - a.performanceScore)

    // Add rank
    const rankedLeaderboard = fullLeaderboard.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }))

    // Get currentUser performance
    const myPerformance = rankedLeaderboard.find((item) => item.userId === authResult.actorUserId) ?? null

    // Get department aggregated totals for the month
    const departmentSummary = {
      totalTeamMembers: teamMembers.length,
      totalDepartmentSqft: rankedLeaderboard.reduce((sum, item) => sum + item.totalSqft, 0),
      totalDetailSqft: rankedLeaderboard.reduce((sum, item) => sum + item.detailSqft, 0),
      totalShortSqft: rankedLeaderboard.reduce((sum, item) => sum + item.shortSqft, 0),
      totalCompletedQuotations: rankedLeaderboard.reduce((sum, item) => sum + item.completedCount, 0),
      avgDepartmentSpeedHours:
        rankedLeaderboard.length > 0
          ? Number(
              (
                rankedLeaderboard.reduce((sum, item) => sum + item.avgWorkingHours, 0) /
                rankedLeaderboard.length
              ).toFixed(1),
            )
          : 0,
    }

    return NextResponse.json({
      success: true,
      monthKey,
      myPerformance,
      departmentSummary,
      leaderboard: rankedLeaderboard,
      debugError: lastError,
    })
  } catch (error) {
    const errorDetails = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error)
    console.error('[GET /api/quotation/performance] Critical Handler Error:', errorDetails)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quotation performance stats', errorDetails },
      { status: 500 },
    )
  }
}
