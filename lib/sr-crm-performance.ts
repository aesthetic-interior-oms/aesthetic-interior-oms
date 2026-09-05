import {
  ActivityType,
  LeadAssignmentDepartment,
  LeadPhaseReviewDecision,
  LeadPhaseType,
  LeadStage,
  type PrismaClient,
} from '@/generated/prisma/client'

type SrCrmPerformanceClient = Pick<
  PrismaClient,
  'user' | 'visit' | 'leadPhaseReview' | 'activityLog' | 'leadMeetingEvent' | 'leadStatusHistory' | 'lead'
>

export type SrCrmPerformanceRow = {
  userId: string
  name: string
  activeProjectSqft: number
  totalAgreementValue: number
  review: {
    score: number
    count: number
    best: number
    better: number
    good: number
  }
  meeting: {
    score: number
    count: number
    best: number
    better: number
    good: number
  }
  conversion: {
    score: number
    count: number
  }
  sqftScore: number
  agreementScore: number
  totalPerformance: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const REVIEW_WEIGHT = 30
const MEETING_WEIGHT = 20
const CONVERSION_WEIGHT = 20
const SQFT_WEIGHT = 15
const AGREEMENT_WEIGHT = 15

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function startOfNextMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth() + 1, 1)
}

function responsivenessPoints(start: Date | null | undefined, end: Date | null | undefined): 0 | 1 | 2 | 3 {
  if (!start || !end) return 0
  const hours = (end.getTime() - start.getTime()) / DAY_MS
  if (hours < 0) return 0
  if (hours <= 1) return 3
  if (hours <= 2) return 2
  if (hours <= 3) return 1
  return 0
}

function addBucket(buckets: { best: number; better: number; good: number }, points: number) {
  if (points === 3) buckets.best += 1
  if (points === 2) buckets.better += 1
  if (points === 1) buckets.good += 1
}

function weightedScore(points: number, count: number, weight: number): number {
  if (count === 0) return 0
  return Math.round((points / (count * 3)) * weight)
}

function isSerialConversion(from: LeadStage, to: LeadStage): boolean {
  return (
    (from === LeadStage.CAD_PHASE && to === LeadStage.DISCOVERY) ||
    (from === LeadStage.DISCOVERY && to === LeadStage.QUOTATION_PHASE) ||
    (from === LeadStage.QUOTATION_PHASE && to === LeadStage.VISUALIZATION_PHASE)
  )
}

export async function calculateSrCrmPerformance(
  prisma: SrCrmPerformanceClient,
  options: { now?: Date; visibleUserIds?: string[] | null } = {},
): Promise<SrCrmPerformanceRow[]> {
  const now = options.now ?? new Date()
  const monthStart = startOfMonth(now)
  const nextMonthStart = startOfNextMonth(now)
  const visibleUserIdSet = options.visibleUserIds ? new Set(options.visibleUserIds) : null

  const srUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      userDepartments: {
        some: { department: { name: LeadAssignmentDepartment.SR_CRM } },
      },
      ...(visibleUserIdSet ? { id: { in: [...visibleUserIdSet] } } : {}),
    },
    orderBy: { fullName: 'asc' },
    select: { id: true, fullName: true },
  })

  const rows = new Map<string, SrCrmPerformanceRow>()
  for (const user of srUsers) {
    rows.set(user.id, {
      userId: user.id,
      name: user.fullName,
      activeProjectSqft: 0,
      totalAgreementValue: 0,
      review: { score: 0, count: 0, best: 0, better: 0, good: 0 },
      meeting: { score: 0, count: 0, best: 0, better: 0, good: 0 },
      conversion: { score: 0, count: 0 },
      sqftScore: 0,
      agreementScore: 0,
      totalPerformance: 0,
    })
  }

  if (rows.size === 0) return []

  const [activeVisits, assignedLeads, phaseReviews, visualApprovals, meetingCompletions, conversions] = await Promise.all([
    prisma.visit.findMany({
      where: {
        lead: {
          assignments: { some: { department: LeadAssignmentDepartment.SR_CRM, userId: { in: [...rows.keys()] } } },
        },
        scheduledAt: { gte: monthStart, lt: nextMonthStart },
        projectSqft: { not: null },
      },
      select: {
        projectSqft: true,
        lead: {
          select: {
            assignments: {
              where: { department: LeadAssignmentDepartment.SR_CRM, userId: { in: [...rows.keys()] } },
              select: { userId: true },
            },
          },
        },
      },
    }),
    prisma.lead.findMany({
      where: {
        OR: [
          { assignments: { some: { department: LeadAssignmentDepartment.SR_CRM, userId: { in: [...rows.keys()] } } } },
          { assignedTo: { in: [...rows.keys()] } },
        ],
        created_at: { lt: nextMonthStart },
      },
      select: {
        id: true,
        agreementValue: true,
        budget: true,
        assignedTo: true,
        assignments: {
          where: { department: LeadAssignmentDepartment.SR_CRM, userId: { in: [...rows.keys()] } },
          select: { userId: true },
        },
      },
    }),
    prisma.leadPhaseReview.findMany({
      where: {
        reviewedById: { in: [...rows.keys()] },
        decision: LeadPhaseReviewDecision.APPROVED,
        submittedAt: { gte: monthStart, lt: nextMonthStart },
        task: { phaseType: { in: [LeadPhaseType.CAD, LeadPhaseType.QUOTATION] } },
      },
      select: {
        reviewedById: true,
        submittedAt: true,
        task: {
          select: {
            startedAt: true,
            phaseType: true,
            lead: {
              select: {
                cadWorkSubmissions: {
                  orderBy: { submittedAt: 'desc' },
                  take: 1,
                  select: { submittedAt: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.activityLog.findMany({
      where: {
        userId: { in: [...rows.keys()] },
        type: ActivityType.PHASE_REVIEW_ROUND,
        createdAt: { gte: monthStart, lt: nextMonthStart },
        description: { startsWith: '3D Visualization submission approved' },
      },
      select: {
        userId: true,
        createdAt: true,
        lead: {
          select: {
            cadWorkSubmissions: {
              orderBy: { submittedAt: 'desc' },
              take: 1,
              select: { submittedAt: true },
            },
          },
        },
      },
    }),
    prisma.activityLog.findMany({
      where: {
        userId: { in: [...rows.keys()] },
        createdAt: { gte: monthStart, lt: nextMonthStart },
        description: { startsWith: 'First meeting completed' },
      },
      select: {
        userId: true,
        createdAt: true,
        lead: {
          select: {
            meetingEvents: {
              where: { createdAt: { lte: nextMonthStart } },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { createdAt: true, startsAt: true },
            },
          },
        },
      },
    }),
    prisma.leadStatusHistory.findMany({
      where: {
        changedById: { in: [...rows.keys()] },
        changedAt: { gte: monthStart, lt: nextMonthStart },
      },
      select: { changedById: true, oldStatus: true, newStatus: true },
    }),
  ])

  for (const visit of activeVisits) {
    for (const assignment of visit.lead.assignments) {
      const row = rows.get(assignment.userId)
      if (row) row.activeProjectSqft += visit.projectSqft ?? 0
    }
  }

  for (const lead of assignedLeads) {
    const userIds = new Set<string>()
    if (lead.assignedTo && rows.has(lead.assignedTo)) userIds.add(lead.assignedTo)
    for (const a of lead.assignments) {
      if (rows.has(a.userId)) userIds.add(a.userId)
    }

    const value = lead.agreementValue ?? lead.budget ?? 0
    for (const uid of userIds) {
      const row = rows.get(uid)
      if (row) row.totalAgreementValue += value
    }
  }

  const maxSqft = Math.max(...[...rows.values()].map((row) => row.activeProjectSqft), 0)
  const maxAgreement = Math.max(...[...rows.values()].map((row) => row.totalAgreementValue), 0)

  const reviewPointsByUser = new Map<string, number>()
  for (const review of phaseReviews) {
    const row = rows.get(review.reviewedById)
    if (!row) continue
    const submittedAt = review.task.lead.cadWorkSubmissions[0]?.submittedAt ?? review.task.startedAt
    const points = responsivenessPoints(submittedAt, review.submittedAt)
    row.review.count += 1
    addBucket(row.review, points)
    reviewPointsByUser.set(review.reviewedById, (reviewPointsByUser.get(review.reviewedById) ?? 0) + points)
  }
  for (const approval of visualApprovals) {
    const row = rows.get(approval.userId)
    if (!row) continue
    const submittedAt = approval.lead.cadWorkSubmissions[0]?.submittedAt
    const points = responsivenessPoints(submittedAt, approval.createdAt)
    row.review.count += 1
    addBucket(row.review, points)
    reviewPointsByUser.set(approval.userId, (reviewPointsByUser.get(approval.userId) ?? 0) + points)
  }

  const meetingPointsByUser = new Map<string, number>()
  for (const meeting of meetingCompletions) {
    const row = rows.get(meeting.userId)
    if (!row) continue
    const start = meeting.lead.meetingEvents[0]?.createdAt ?? meeting.lead.meetingEvents[0]?.startsAt
    const points = responsivenessPoints(start, meeting.createdAt)
    row.meeting.count += 1
    addBucket(row.meeting, points)
    meetingPointsByUser.set(meeting.userId, (meetingPointsByUser.get(meeting.userId) ?? 0) + points)
  }

  for (const conversion of conversions) {
    const row = rows.get(conversion.changedById)
    if (row && isSerialConversion(conversion.oldStatus, conversion.newStatus)) row.conversion.count += 1
  }
  const maxConversions = Math.max(...[...rows.values()].map((row) => row.conversion.count), 0)

  for (const row of rows.values()) {
    row.activeProjectSqft = Math.round(row.activeProjectSqft)
    row.totalAgreementValue = Math.round(row.totalAgreementValue)
    row.review.score = weightedScore(reviewPointsByUser.get(row.userId) ?? 0, row.review.count, REVIEW_WEIGHT)
    row.meeting.score = weightedScore(meetingPointsByUser.get(row.userId) ?? 0, row.meeting.count, MEETING_WEIGHT)
    row.conversion.score = maxConversions > 0 ? Math.round((row.conversion.count / maxConversions) * CONVERSION_WEIGHT) : 0
    row.sqftScore = maxSqft > 0 ? Math.round((row.activeProjectSqft / maxSqft) * SQFT_WEIGHT) : 0
    row.agreementScore = maxAgreement > 0 ? Math.round((row.totalAgreementValue / maxAgreement) * AGREEMENT_WEIGHT) : 0

    row.totalPerformance = Math.min(
      100,
      row.review.score + row.meeting.score + row.conversion.score + row.sqftScore + row.agreementScore,
    )
  }

  return [...rows.values()].sort((first, second) => second.totalPerformance - first.totalPerformance || first.name.localeCompare(second.name))
}
