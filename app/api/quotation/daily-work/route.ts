import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import {
  detectQuotationWorkForDate,
  formatDateKey,
  getWeekCycleInfo,
  isWeekLockedForDateKey,
  parseDateKey,
  saveDailyWorkReport,
  type DailyWorkEntryInput,
  type QuotationWorkType,
} from '@/lib/quotation-daily-work'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const searchParams = request.nextUrl.searchParams
    const todayKey = formatDateKey(new Date())
    const selectedDateKey = searchParams.get('dateKey') || todayKey
    const weekKey = searchParams.get('weekKey') || selectedDateKey
    const targetUserIdParam = searchParams.get('userId')

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const isAdminOrSr = actorDepartments.has('ADMIN') || actorDepartments.has('SR_CRM')
    const targetUserId =
      isAdminOrSr && targetUserIdParam && targetUserIdParam.trim().length > 0
        ? targetUserIdParam.trim()
        : authResult.actorUserId

    // Fetch user info
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, fullName: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Get week metadata and day status
    const weekInfo = await getWeekCycleInfo(targetUserId, weekKey)

    // Check lock status for the selected dateKey
    const isDateLocked = isWeekLockedForDateKey(selectedDateKey)

    // Fetch saved entries for this selected date
    const currentEntries = await prisma.quotationDailyWorkReport.findMany({
      where: {
        userId: targetUserId,
        dateKey: selectedDateKey,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            clientId: true,
            phone: true,
            stage: true,
            subStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Detect work done on this date
    const rawDetected = await detectQuotationWorkForDate(targetUserId, selectedDateKey)

    // Filter out detected leads that are already saved in currentEntries
    const savedKeys = new Set(currentEntries.map((e) => `${e.leadId}:${e.workType}`))
    const suggestedLeads = rawDetected.filter(
      (detected) => !savedKeys.has(`${detected.leadId}:${detected.workType}`),
    )

    return NextResponse.json({
      success: true,
      selectedDateKey,
      isDateLocked,
      weekInfo,
      user,
      currentEntries: currentEntries.map((e) => ({
        id: e.id,
        leadId: e.leadId,
        leadName: e.lead.name,
        clientId: e.lead.clientId,
        phone: e.lead.phone,
        stage: e.lead.stage,
        subStatus: e.lead.subStatus,
        workType: e.workType,
        sqft: e.sqft,
        notes: e.notes,
        isAutoDetected: e.isAutoDetected,
        createdAt: e.createdAt,
      })),
      suggestedLeads,
    })
  } catch (error) {
    console.error('[GET /api/quotation/daily-work] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch daily work report' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const body = (await request.json().catch(() => ({}))) as {
      dateKey?: unknown
      entries?: unknown
      userId?: unknown
    }

    const todayKey = formatDateKey(new Date())
    const dateKey = typeof body.dateKey === 'string' && body.dateKey.trim().length > 0
      ? body.dateKey.trim()
      : todayKey

    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return NextResponse.json({ success: false, error: 'Invalid dateKey format' }, { status: 400 })
    }

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const isAdminOrSr = actorDepartments.has('ADMIN') || actorDepartments.has('SR_CRM')
    const targetUserId =
      isAdminOrSr && typeof body.userId === 'string' && body.userId.trim().length > 0
        ? body.userId.trim()
        : authResult.actorUserId

    if (!Array.isArray(body.entries)) {
      return NextResponse.json({ success: false, error: 'Entries must be an array' }, { status: 400 })
    }

    const rawEntries = body.entries as Array<Record<string, unknown>>
    const validWorkTypes = new Set<string>(['DETAIL', 'SHORT', 'FURNITURE', 'ELECTRICAL'])

    const cleanEntries: DailyWorkEntryInput[] = []
    for (const item of rawEntries) {
      if (typeof item.leadId !== 'string' || !item.leadId.trim()) {
        continue
      }
      const rawType = typeof item.workType === 'string' ? item.workType.toUpperCase() : 'DETAIL'
      const workType = (validWorkTypes.has(rawType) ? rawType : 'DETAIL') as QuotationWorkType
      const sqft = typeof item.sqft === 'number' && Number.isFinite(item.sqft)
        ? Math.max(0, item.sqft)
        : Math.max(0, Number(item.sqft) || 0)

      cleanEntries.push({
        leadId: item.leadId.trim(),
        workType,
        sqft,
        notes: typeof item.notes === 'string' ? item.notes : null,
        isAutoDetected: Boolean(item.isAutoDetected),
      })
    }

    try {
      const saved = await saveDailyWorkReport(targetUserId, dateKey, cleanEntries)
      return NextResponse.json({
        success: true,
        message: 'Daily work report saved successfully',
        data: saved,
      })
    } catch (saveError) {
      if (saveError instanceof Error && saveError.message.includes('locked')) {
        return NextResponse.json(
          { success: false, error: saveError.message },
          { status: 403 },
        )
      }
      throw saveError
    }
  } catch (error) {
    console.error('[POST /api/quotation/daily-work] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save daily work report' },
      { status: 500 },
    )
  }
}
