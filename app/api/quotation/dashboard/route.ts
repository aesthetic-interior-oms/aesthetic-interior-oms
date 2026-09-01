import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { LeadAssignmentDepartment, LeadStage, LeadSubStatus } from '@/generated/prisma/client'
import { requireDatabaseRoles } from '@/lib/authz'

export async function GET() {
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

    // Fetch leads assigned to the quotation team / current user
    const [assignedLeads, allQuotationDrafts, recentQuotationLeads] = await Promise.all([
      prisma.lead.findMany({
        where: {
          assignments: {
            some: {
              department: LeadAssignmentDepartment.QUOTATION,
              userId: currentUserId,
            },
          },
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
            select: { projectSqft: true },
            orderBy: { scheduledAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.quotationDraft.findMany({
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

    // Aggregate key KPI counters
    const assignedCount = assignedLeads.filter((l) => l.subStatus === LeadSubStatus.QUOTATION_ASSIGNED).length
    const workingCount = assignedLeads.filter((l) => l.subStatus === LeadSubStatus.QUOTATION_WORKING).length
    const completedCount = assignedLeads.filter(
      (l) => l.subStatus === LeadSubStatus.QUOTATION_COMPLETED || l.subStatus === LeadSubStatus.QUOTATION_APPROVED,
    ).length
    const correctionCount = assignedLeads.filter((l) => l.subStatus === LeadSubStatus.QUOTATION_CORRECTION).length
    const totalAssignedTasks = assignedLeads.length

    // Calculate total square footage handled
    const totalSqftHandled = assignedLeads.reduce((acc, lead) => {
      const sqft = lead.visits[0]?.projectSqft
      return acc + (typeof sqft === 'number' ? sqft : 0)
    }, 0)

    // Calculate status breakdown for Pie/Bar charts
    const statusBreakdown = [
      { name: 'Assigned', value: assignedCount, color: '#3b82f6' },
      { name: 'In Working', value: workingCount, color: '#f59e0b' },
      { name: 'Completed', value: completedCount, color: '#10b981' },
      { name: 'Correction', value: correctionCount, color: '#ef4444' },
    ]

    // Weekly/Monthly activity breakdown (last 6 months / recent weeks)
    const monthlyActivityMap: Record<string, { month: string; created: number; completed: number }> = {}
    
    // Default last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthKey = d.toLocaleString('en-US', { month: 'short' })
      monthlyActivityMap[monthKey] = { month: monthKey, created: 0, completed: 0 }
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
