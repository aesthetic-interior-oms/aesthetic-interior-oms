import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { LeadAssignmentDepartment, LeadStage, LeadSubStatus } from '@/generated/prisma/client'
import { requireDatabaseRoles } from '@/lib/authz'
import { calculateLeadQuotationSqftSummary } from '@/lib/quotation-sqft-calculator'
import { getMonthKey } from '@/lib/quotation-performance'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const canView =
      actorDepartments.has('ADMIN') ||
      actorDepartments.has('SR_CRM') ||
      actorDepartments.has('QUOTATION') ||
      actorDepartments.has('QUOTATION_TEAM')

    if (!canView) {
      return NextResponse.json(
        { success: false, error: 'Only quotation team, senior CRM, or admin can access quotation dashboard stats' },
        { status: 403 },
      )
    }

    const currentUserId = authResult.actorUserId
    const searchParams = request.nextUrl.searchParams
    const monthKey = searchParams.get('month') || getMonthKey()

    const [yyyy, mm] = monthKey.split('-').map(Number)
    const startDate = new Date(yyyy, (mm || 1) - 1, 1, 0, 0, 0, 0)
    const endDate = new Date(yyyy, mm || 1, 0, 23, 59, 59, 999)

    // Fetch leads assigned to the quotation team / current user
    const [assignedLeads, allQuotationDrafts, recentQuotationLeads] = await Promise.all([
      prisma.lead.findMany({
        where: {
          OR: [
            { assignedTo: currentUserId },
            { primaryOwnerUserId: currentUserId },
            {
              assignments: {
                some: {
                  department: LeadAssignmentDepartment.QUOTATION,
                  userId: currentUserId,
                },
              },
            },
            {
              quotationDrafts: {
                some: {
                  OR: [{ createdById: currentUserId }, { updatedById: currentUserId }],
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          stage: true,
          subStatus: true,
          budget: true,
          created_at: true,
          updated_at: true,
          visits: {
            select: { projectSqft: true, scheduledAt: true, status: true },
            orderBy: { scheduledAt: 'desc' },
          },
          quotationDrafts: {
            select: {
              draftKey: true,
              projectSqft: true,
              content: true,
              updatedAt: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.quotationDraft.findMany({
        where: {
          updatedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          leadId: true,
          draftKey: true,
          quotationType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.lead.findMany({
        where: {
          stage: LeadStage.QUOTATION_PHASE,
        },
        select: {
          id: true,
          name: true,
          stage: true,
          subStatus: true,
          updated_at: true,
          assignments: {
            where: { department: LeadAssignmentDepartment.QUOTATION },
            select: { user: { select: { fullName: true } } },
          },
        },
        orderBy: { updated_at: 'desc' },
        take: 6,
      }),
    ])

    // Filter leads relevant to the selected month
    const monthLeads = assignedLeads.filter((lead) => {
      const createdAt = new Date(lead.created_at)
      const updatedAt = new Date(lead.updated_at)
      const inCreated = createdAt >= startDate && createdAt <= endDate
      const inUpdated = updatedAt >= startDate && updatedAt <= endDate
      const inVisits = lead.visits.some((v) => {
        const d = new Date(v.scheduledAt)
        return d >= startDate && d <= endDate
      })
      const inDrafts = lead.quotationDrafts.some((d) => {
        const u = new Date(d.updatedAt)
        const c = new Date(d.createdAt)
        return (u >= startDate && u <= endDate) || (c >= startDate && c <= endDate)
      })
      return inCreated || inUpdated || inVisits || inDrafts
    })

    // Use monthLeads if any, else fall back to assignedLeads if total history requested
    const targetLeads = monthLeads.length > 0 ? monthLeads : assignedLeads

    // Aggregate key KPI counters for the selected month
    const assignedCount = targetLeads.filter((l) => l.subStatus === LeadSubStatus.QUOTATION_ASSIGNED).length
    const workingCount = targetLeads.filter((l) => l.subStatus === LeadSubStatus.QUOTATION_WORKING).length
    const completedCount = targetLeads.filter(
      (l) => l.subStatus === LeadSubStatus.QUOTATION_COMPLETED || l.subStatus === LeadSubStatus.QUOTATION_APPROVED,
    ).length
    const correctionCount = targetLeads.filter((l) => l.subStatus === LeadSubStatus.QUOTATION_CORRECTION).length
    const totalAssignedTasks = targetLeads.length

    // Calculate total square footage handled for the selected month using calculator summary
    const totalSqftHandled = targetLeads.reduce((acc, lead) => {
      const completedVisitSqft = lead.visits.find((v) => v.status === 'COMPLETED' && v.projectSqft)?.projectSqft ?? null
      const anyVisitSqft = lead.visits.find((v) => v.projectSqft)?.projectSqft ?? null
      const fallbackSqft = Number(completedVisitSqft ?? anyVisitSqft ?? 0)
      const summary = calculateLeadQuotationSqftSummary(lead.quotationDrafts, fallbackSqft)
      return acc + summary.totalAvgSqft
    }, 0)

    // Calculate status breakdown for Pie/Bar charts
    const statusBreakdown = [
      { name: 'Assigned', value: assignedCount, color: '#3b82f6' },
      { name: 'In Working', value: workingCount, color: '#f59e0b' },
      { name: 'Completed', value: completedCount, color: '#10b981' },
      { name: 'Correction', value: correctionCount, color: '#ef4444' },
    ]

    // Monthly activity breakdown for recent 6 months
    const monthlyActivityMap: Record<string, { month: string; created: number; completed: number }> = {}
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(startDate)
      d.setMonth(d.getMonth() - i)
      const monthLabel = d.toLocaleString('en-US', { month: 'short' })
      monthlyActivityMap[monthLabel] = { month: monthLabel, created: 0, completed: 0 }
    }

    assignedLeads.forEach((lead) => {
      const createdMonth = new Date(lead.created_at).toLocaleString('en-US', { month: 'short' })
      if (monthlyActivityMap[createdMonth]) {
        monthlyActivityMap[createdMonth].created += 1
      }
      if (
        (lead.subStatus === LeadSubStatus.QUOTATION_COMPLETED || lead.subStatus === LeadSubStatus.QUOTATION_APPROVED) &&
        lead.updated_at
      ) {
        const completedMonth = new Date(lead.updated_at).toLocaleString('en-US', { month: 'short' })
        if (monthlyActivityMap[completedMonth]) {
          monthlyActivityMap[completedMonth].completed += 1
        }
      }
    })

    const monthlyTrends = Object.values(monthlyActivityMap)

    return NextResponse.json({
      success: true,
      monthKey,
      stats: {
        totalAssignedTasks,
        assignedCount,
        workingCount,
        completedCount,
        correctionCount,
        totalSqftHandled,
        statusBreakdown,
        monthlyTrends,
        recentLeads: recentQuotationLeads.map((l) => ({
          id: l.id,
          name: l.name,
          status: l.subStatus,
          assignee: l.assignments[0]?.user?.fullName ?? 'Unassigned',
          updatedAt: l.updated_at,
        })),
        draftCount: allQuotationDrafts.length,
      },
    })
  } catch (error) {
    console.error('[quotation/dashboard][GET] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load quotation dashboard statistics' }, { status: 500 })
  }
}
