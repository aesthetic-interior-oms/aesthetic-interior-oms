import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { normalizeMonthKey, syncAllQuotationTeamPerformance } from '@/lib/quotation-performance'
import { calculateSrCrmPerformance } from '@/lib/sr-crm-performance'
import { getMonthlyVisitTeamPerformance } from '@/lib/visit-performance'
import {
  DepartmentType,
  getEnabledDepartmentUserIds,
  getDisabledDepartmentUserIds,
  getDepartmentMemberMonthlySettings,
} from '@/lib/department-performance-settings'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const searchParams = request.nextUrl.searchParams
    const department = (searchParams.get('department') || 'ALL').toUpperCase()
    const monthKey = normalizeMonthKey(searchParams.get('month'))

    const [yearStr, monthStr] = monthKey.split('-')
    const targetMonthDate = new Date(Number(yearStr), (Number(monthStr) || 1) - 1, 15)

    const responseData: Record<string, unknown> = {
      monthKey,
    }

    if (department === 'SR_CRM' || department === 'ALL') {
      const disabledIds = await getDisabledDepartmentUserIds('SR_CRM', monthKey)
      const allSrRows = await calculateSrCrmPerformance(prisma, { now: targetMonthDate })
      responseData.srCrmMembers = allSrRows.map((row) => ({
        ...row,
        isEnabled: !disabledIds.has(row.userId),
      }))
    }

    if (department === 'VISIT_TEAM' || department === 'ALL') {
      const visitData = await getMonthlyVisitTeamPerformance(monthKey)
      responseData.visitTeamMembers = visitData.members
    }

    if (department === 'JR_ARCHITECT' || department === 'ALL') {
      const disabledIds = await getDisabledDepartmentUserIds('JR_ARCHITECT', monthKey)
      const jrRecords = await prisma.jrArchitectPerformance.findMany({
        where: { monthYear: monthKey },
        include: { user: { select: { fullName: true } } },
        orderBy: { performanceScore: 'desc' },
      })
      responseData.jrArchitectMembers = jrRecords.map((r) => ({
        id: r.id,
        userId: r.userId,
        totalWork: r.totalWork,
        totalSqft: r.totalSqft,
        totalTimeMinutes: r.totalTimeMinutes,
        performanceScore: r.performanceScore,
        user: { fullName: r.user.fullName },
        isEnabled: !disabledIds.has(r.userId),
      }))
    }

    if (department === 'QUOTATION' || department === 'ALL') {
      const enabledIds = await getEnabledDepartmentUserIds('QUOTATION', monthKey)
      try {
        await syncAllQuotationTeamPerformance(targetMonthDate)
      } catch (e) {
        console.warn('Quotation sync non-fatal warning:', e)
      }

      const [quotationRecords, quotationUsers] = await Promise.all([
        prisma.quotationUserPerformance.findMany({
          where: { monthKey },
          include: { user: { select: { fullName: true, email: true } } },
          orderBy: { performanceScore: 'desc' },
        }),
        getDepartmentMemberMonthlySettings('QUOTATION', monthKey),
      ])

      const recordMap = new Map(quotationRecords.map((r) => [r.userId, r]))
      responseData.quotationMembers = quotationUsers.map((m) => {
        const perf = recordMap.get(m.userId)
        return {
          userId: m.userId,
          fullName: m.fullName,
          email: m.email || '',
          detailSqft: perf?.detailSqft ?? 0,
          shortSqft: perf?.shortSqft ?? 0,
          totalSqft: perf?.totalSqft ?? 0,
          completedCount: perf?.completedCount ?? 0,
          avgWorkingHours: perf?.avgWorkingHours ?? 0,
          performanceScore: perf?.performanceScore ?? 0,
          isEnabled: m.isEnabled,
        }
      })
    }

    return NextResponse.json({
      success: true,
      department,
      monthKey,
      data: responseData,
    })
  } catch (error) {
    console.error('[GET /api/admin/department-performance-data] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch department performance data' },
      { status: 500 },
    )
  }
}
