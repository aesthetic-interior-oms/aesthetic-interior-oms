import prisma from '@/lib/prisma'
import { QuotationWorkType } from '@/generated/prisma/client'
import { recalculateQuotationUserPerformance } from '@/lib/quotation-performance'

export { QuotationWorkType }

export interface DailyWorkEntryInput {
  leadId: string
  workType: QuotationWorkType
  sqft: number
  notes?: string | null
  isAutoDetected?: boolean
}

export interface DayInfo {
  dayName: string
  shortDayName: string
  dateKey: string
  dateLabel: string
  isToday: boolean
  isFuture: boolean
  entriesCount: number
  totalSqft: number
}

export interface WeekCycleInfo {
  weekKey: string // Saturday dateKey: YYYY-MM-DD
  saturdayDate: string
  fridayDate: string
  lockDeadline: string // ISO string of Friday 12:00 PM
  isLocked: boolean
  days: DayInfo[]
  weekTotalSqft: number
  weekTotalEntries: number
}

export interface DetectedLeadWork {
  leadId: string
  leadName: string
  clientId: string | null
  workType: QuotationWorkType
  defaultSqft: number
  detectedReason: string
}

/**
 * Format a Date object to YYYY-MM-DD in local time
 */
export function formatDateKey(date: Date = new Date()): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Parse a YYYY-MM-DD string into a local Date set to 00:00:00
 */
export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

/**
 * Return start (00:00:00.000) and end (23:59:59.999) Date objects for a dateKey
 */
export function getDateDayRange(dateKey: string) {
  const start = parseDateKey(dateKey)
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * Get the Saturday that starts the work-week cycle for any given date.
 * Week cycle: Saturday to Friday (Freeze deadline: Friday 12:00 PM).
 */
export function getCycleSaturday(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const day = d.getDay()
  const daysSinceSaturday = (day + 1) % 7 // Sat:0, Sun:1, Mon:2, Tue:3, Wed:4, Thu:5, Fri:6
  d.setDate(d.getDate() - daysSinceSaturday)
  return d
}

/**
 * Returns the freeze deadline (Friday 12:00:00 PM local time) for a Saturday week cycle.
 */
export function getCycleFridayLockDeadline(saturday: Date): Date {
  const friday = new Date(saturday)
  friday.setDate(friday.getDate() + 6)
  friday.setHours(12, 0, 0, 0)
  return friday
}

/**
 * Check if the week containing a specific dateKey is locked for edits.
 * Rule: Locks on Friday at 12:00 PM local time.
 */
export function isWeekLockedForDateKey(dateKey: string, now: Date = new Date()): boolean {
  const targetDate = parseDateKey(dateKey)
  const saturday = getCycleSaturday(targetDate)
  const lockDeadline = getCycleFridayLockDeadline(saturday)

  // If now is past Friday 12:00 PM of that cycle, it is locked
  return now.getTime() >= lockDeadline.getTime()
}

const WEEKDAY_NAMES = [
  { full: 'Saturday', short: 'Sat' },
  { full: 'Sunday', short: 'Sun' },
  { full: 'Monday', short: 'Mon' },
  { full: 'Tuesday', short: 'Tue' },
  { full: 'Wednesday', short: 'Wed' },
  { full: 'Thursday', short: 'Thu' },
  { full: 'Friday', short: 'Fri' },
]

/**
 * Get full week information for a user given a target date (or weekKey).
 */
export async function getWeekCycleInfo(
  userId: string,
  targetDateOrKey?: string | Date,
  now: Date = new Date(),
): Promise<WeekCycleInfo> {
  const baseDate =
    typeof targetDateOrKey === 'string'
      ? parseDateKey(targetDateOrKey)
      : targetDateOrKey ?? now

  const saturday = getCycleSaturday(baseDate)
  const weekKey = formatDateKey(saturday)
  const lockDeadlineDate = getCycleFridayLockDeadline(saturday)
  const isLocked = now.getTime() >= lockDeadlineDate.getTime()
  const todayKey = formatDateKey(now)

  // Pre-generate the 7 days
  const dayDates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(saturday)
    d.setDate(d.getDate() + i)
    dayDates.push(d)
  }

  const dateKeys = dayDates.map((d) => formatDateKey(d))

  // Fetch all existing report entries for this user for this week
  const existingReports = await prisma.quotationDailyWorkReport.findMany({
    where: {
      userId,
      dateKey: { in: dateKeys },
    },
    select: {
      dateKey: true,
      sqft: true,
    },
  })

  // Group stats by dateKey
  const statsMap = new Map<string, { count: number; totalSqft: number }>()
  for (const report of existingReports) {
    const curr = statsMap.get(report.dateKey) ?? { count: 0, totalSqft: 0 }
    curr.count += 1
    curr.totalSqft += report.sqft
    statsMap.set(report.dateKey, curr)
  }

  let weekTotalSqft = 0
  let weekTotalEntries = 0

  const days: DayInfo[] = dayDates.map((d, index) => {
    const dKey = dateKeys[index]!
    const stats = statsMap.get(dKey) ?? { count: 0, totalSqft: 0 }
    weekTotalSqft += stats.totalSqft
    weekTotalEntries += stats.count

    const weekdayMeta = WEEKDAY_NAMES[index]!
    const dateLabel = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    const isToday = dKey === todayKey
    const isFuture = dKey > todayKey

    return {
      dayName: weekdayMeta.full,
      shortDayName: weekdayMeta.short,
      dateKey: dKey,
      dateLabel,
      isToday,
      isFuture,
      entriesCount: stats.count,
      totalSqft: stats.totalSqft,
    }
  })

  return {
    weekKey,
    saturdayDate: dateKeys[0]!,
    fridayDate: dateKeys[6]!,
    lockDeadline: lockDeadlineDate.toISOString(),
    isLocked,
    days,
    weekTotalSqft,
    weekTotalEntries,
  }
}

/**
 * Detect quotation work done by the user on a specific dateKey.
 * Checks:
 * 1. QuotationWorkActivityLog for this user on dateKey
 * 2. QuotationDraft updated by user on that date
 * 3. FurnitureQuotationDraft updated by user on that date
 * 4. ElectricalQuotationDraft updated by user on that date
 */
export async function detectQuotationWorkForDate(
  userId: string,
  dateKey: string,
): Promise<DetectedLeadWork[]> {
  const { start, end } = getDateDayRange(dateKey)
  const detectedMap = new Map<string, DetectedLeadWork>()

  function addDetected(item: DetectedLeadWork) {
    const mapKey = `${item.leadId}:${item.workType}`
    if (!detectedMap.has(mapKey)) {
      detectedMap.set(mapKey, item)
    }
  }

  // 1. From QuotationWorkActivityLog
  const activityLogs = await prisma.quotationWorkActivityLog.findMany({
    where: {
      userId,
      dateKey,
    },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          clientId: true,
          visits: { select: { projectSqft: true }, orderBy: { scheduledAt: 'desc' }, take: 1 },
        },
      },
    },
  })

  for (const log of activityLogs) {
    const defaultSqft = log.lead.visits[0]?.projectSqft ?? 0
    addDetected({
      leadId: log.lead.id,
      leadName: log.lead.name,
      clientId: log.lead.clientId,
      workType: log.workType,
      defaultSqft: typeof defaultSqft === 'number' && Number.isFinite(defaultSqft) ? defaultSqft : 0,
      detectedReason: log.description || `Worked on ${log.workType.toLowerCase()} quotation`,
    })
  }

  // 2. From QuotationDraft (Detail or Short) updated today by user
  const drafts = await prisma.quotationDraft.findMany({
    where: {
      OR: [{ updatedById: userId }, { createdById: userId }],
      updatedAt: { gte: start, lte: end },
    },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          clientId: true,
          visits: { select: { projectSqft: true }, orderBy: { scheduledAt: 'desc' }, take: 1 },
        },
      },
    },
  })

  for (const draft of drafts) {
    const isShort = draft.draftKey.startsWith('short')
    const workType: QuotationWorkType = isShort ? QuotationWorkType.SHORT : QuotationWorkType.DETAIL
    const defaultSqft =
      typeof draft.projectSqft === 'number' && draft.projectSqft > 0
        ? draft.projectSqft
        : draft.lead.visits[0]?.projectSqft ?? 0

    addDetected({
      leadId: draft.lead.id,
      leadName: draft.lead.name,
      clientId: draft.lead.clientId,
      workType,
      defaultSqft: typeof defaultSqft === 'number' && Number.isFinite(defaultSqft) ? defaultSqft : 0,
      detectedReason: `Saved ${isShort ? 'Short' : 'Detail'} Quotation`,
    })
  }

  // 3. From FurnitureQuotationDraft
  const furnitureDrafts = await prisma.furnitureQuotationDraft.findMany({
    where: {
      OR: [{ updatedById: userId }, { createdById: userId }],
      updatedAt: { gte: start, lte: end },
    },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          clientId: true,
          visits: { select: { projectSqft: true }, orderBy: { scheduledAt: 'desc' }, take: 1 },
        },
      },
    },
  })

  for (const fDraft of furnitureDrafts) {
    const defaultSqft = fDraft.lead.visits[0]?.projectSqft ?? 0
    addDetected({
      leadId: fDraft.lead.id,
      leadName: fDraft.lead.name,
      clientId: fDraft.lead.clientId,
      workType: QuotationWorkType.FURNITURE,
      defaultSqft: typeof defaultSqft === 'number' && Number.isFinite(defaultSqft) ? defaultSqft : 0,
      detectedReason: 'Saved Furniture Quotation',
    })
  }

  // 4. From ElectricalQuotationDraft
  const electricalDrafts = await prisma.electricalQuotationDraft.findMany({
    where: {
      OR: [{ updatedById: userId }, { createdById: userId }],
      updatedAt: { gte: start, lte: end },
    },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          clientId: true,
          visits: { select: { projectSqft: true }, orderBy: { scheduledAt: 'desc' }, take: 1 },
        },
      },
    },
  })

  for (const eDraft of electricalDrafts) {
    const defaultSqft = eDraft.lead.visits[0]?.projectSqft ?? 0
    addDetected({
      leadId: eDraft.lead.id,
      leadName: eDraft.lead.name,
      clientId: eDraft.lead.clientId,
      workType: QuotationWorkType.ELECTRICAL,
      defaultSqft: typeof defaultSqft === 'number' && Number.isFinite(defaultSqft) ? defaultSqft : 0,
      detectedReason: 'Saved Electrical Quotation',
    })
  }

  return Array.from(detectedMap.values())
}

/**
 * Log activity when user performs quotation changes.
 */
export async function logQuotationWorkActivity(
  userId: string,
  leadId: string,
  workType: QuotationWorkType,
  description?: string,
  date: Date = new Date(),
) {
  try {
    const dateKey = formatDateKey(date)
    await prisma.quotationWorkActivityLog.create({
      data: {
        userId,
        leadId,
        workType,
        activityDate: date,
        dateKey,
        description,
      },
    })
  } catch (err) {
    console.error('[logQuotationWorkActivity] Error:', err)
  }
}

/**
 * Save user daily work report entries for a given dateKey.
 * Replaces entries for that day with the submitted list.
 */
export async function saveDailyWorkReport(
  userId: string,
  dateKey: string,
  entries: DailyWorkEntryInput[],
  now: Date = new Date(),
) {
  // Check if locked
  if (isWeekLockedForDateKey(dateKey, now)) {
    throw new Error('Editing is locked for this week. Weekly edits are disabled every Friday at 12:00 PM.')
  }

  const workDate = parseDateKey(dateKey)
  const saturday = getCycleSaturday(workDate)
  const weekKey = formatDateKey(saturday)

  // Validate leads exist
  const leadIds = Array.from(new Set(entries.map((e) => e.leadId)))
  if (leadIds.length > 0) {
    const existingLeads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true },
    })
    const existingSet = new Set(existingLeads.map((l) => l.id))
    for (const leadId of leadIds) {
      if (!existingSet.has(leadId)) {
        throw new Error(`Lead with ID ${leadId} not found`)
      }
    }
  }

  // Clean entries: ensure sqft >= 0
  const cleanEntries = entries.map((entry) => ({
    userId,
    leadId: entry.leadId,
    workDate,
    dateKey,
    weekKey,
    workType: entry.workType,
    sqft: Math.max(0, Number(entry.sqft) || 0),
    isAutoDetected: Boolean(entry.isAutoDetected),
    notes: entry.notes?.trim() || null,
  }))

  const saved = await prisma.$transaction(async (tx) => {
    // Delete existing entries for this user on this day
    await tx.quotationDailyWorkReport.deleteMany({
      where: {
        userId,
        dateKey,
      },
    })

    if (cleanEntries.length === 0) {
      return []
    }

    // Insert new entries
    const created = await Promise.all(
      cleanEntries.map((data) =>
        tx.quotationDailyWorkReport.create({
          data,
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                clientId: true,
              },
            },
          },
        }),
      ),
    )

    return created
  })

  // Trigger quotation user performance recalculation for this month
  void recalculateQuotationUserPerformance(userId, workDate).catch((err) => {
    console.error('[saveDailyWorkReport] Performance sync error:', err)
  })

  return saved
}
