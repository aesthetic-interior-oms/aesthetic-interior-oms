import { NotificationType, VisitStatus } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { sendPushToUser } from '@/lib/fcm-service'
import { getMonthlyVisitTeamPerformance } from '@/lib/visit-performance'
import { VISIT_TEAM_LEADERSHIP_ROLES } from '@/lib/visit-team-roles'

/**
 * Checks for visits that remain SCHEDULED at 10h, 20h, and 24h past their scheduled time.
 * Automatically saves records to prisma.notification to prevent duplicate alerts
 * and sends rich FCM push notifications to the assigned specialists and team leaders.
 */
export async function checkIncompleteVisitEscalations(targetUserId?: string): Promise<{
  notified10h: number
  notified20h: number
  notified24h: number
}> {
  const now = new Date()
  const cutoff10h = new Date(now.getTime() - 10 * 60 * 60 * 1000)
  const cutoff20h = new Date(now.getTime() - 20 * 60 * 60 * 1000)
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  let notified10h = 0
  let notified20h = 0
  let notified24h = 0

  // ── 1. Check 10-Hour Incomplete Visits ──────────────────────────────────────
  const visits10h = await prisma.visit.findMany({
    where: {
      status: VisitStatus.SCHEDULED,
      scheduledAt: { lte: cutoff10h },
      ...(targetUserId
        ? {
            OR: [
              { assignedToId: targetUserId },
              { supportAssignments: { some: { supportUserId: targetUserId } } },
            ],
          }
        : {}),
    },
    include: {
      lead: { select: { id: true, name: true, location: true } },
      assignedTo: { select: { id: true, fullName: true } },
      supportAssignments: {
        select: {
          supportUserId: true,
          supportUser: { select: { id: true, fullName: true } },
        },
      },
    },
    take: 100,
  })

  for (const visit of visits10h) {
    const userIds = new Set<string>()
    if (visit.assignedToId) userIds.add(visit.assignedToId)
    visit.supportAssignments.forEach((s) => userIds.add(s.supportUserId))

    for (const uId of userIds) {
      if (targetUserId && uId !== targetUserId) continue

      // Verify we haven't already notified this user for 10h on this visit
      const existing = await prisma.notification.findUnique({
        where: {
          userId_visitId_type: {
            userId: uId,
            visitId: visit.id,
            type: NotificationType.VISIT_DUE_10H,
          },
        },
      })

      if (!existing) {
        const title = '⚠️ Pending Visit Report (10h Elapsed)'
        const body = `Visit with ${visit.lead.name} was scheduled 10 hours ago. Please complete the visit and submit your findings.`

        await prisma.notification.create({
          data: {
            userId: uId,
            leadId: visit.leadId,
            visitId: visit.id,
            type: NotificationType.VISIT_DUE_10H,
            title,
            message: body,
            scheduledFor: visit.scheduledAt,
          },
        })

        await sendPushToUser(uId, title, body, {
          type: 'VISIT_DUE_10H',
          visitId: visit.id,
          leadId: visit.leadId,
        })

        notified10h++
      }
    }
  }

  // ── 2. Check 20-Hour Incomplete Visits ──────────────────────────────────────
  const visits20h = await prisma.visit.findMany({
    where: {
      status: VisitStatus.SCHEDULED,
      scheduledAt: { lte: cutoff20h },
      ...(targetUserId
        ? {
            OR: [
              { assignedToId: targetUserId },
              { supportAssignments: { some: { supportUserId: targetUserId } } },
            ],
          }
        : {}),
    },
    include: {
      lead: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, fullName: true } },
      supportAssignments: {
        select: {
          supportUserId: true,
        },
      },
    },
    take: 100,
  })

  for (const visit of visits20h) {
    const userIds = new Set<string>()
    if (visit.assignedToId) userIds.add(visit.assignedToId)
    visit.supportAssignments.forEach((s) => userIds.add(s.supportUserId))

    for (const uId of userIds) {
      if (targetUserId && uId !== targetUserId) continue

      const existing = await prisma.notification.findUnique({
        where: {
          userId_visitId_type: {
            userId: uId,
            visitId: visit.id,
            type: NotificationType.VISIT_DUE_20H,
          },
        },
      })

      if (!existing) {
        const title = '🚨 Action Required: Overdue Visit (20h)'
        const body = `The report for ${visit.lead.name} is still pending after 20 hours. Late submissions impact your performance score.`

        await prisma.notification.create({
          data: {
            userId: uId,
            leadId: visit.leadId,
            visitId: visit.id,
            type: NotificationType.VISIT_DUE_20H,
            title,
            message: body,
            scheduledFor: visit.scheduledAt,
          },
        })

        await sendPushToUser(uId, title, body, {
          type: 'VISIT_DUE_20H',
          visitId: visit.id,
          leadId: visit.leadId,
        })

        notified20h++
      }
    }
  }

  // ── 3. Check 24-Hour Incomplete Visits & Escalate to Leaders ───────────────
  const visits24h = await prisma.visit.findMany({
    where: {
      status: VisitStatus.SCHEDULED,
      scheduledAt: { lte: cutoff24h },
      ...(targetUserId
        ? {
            OR: [
              { assignedToId: targetUserId },
              { supportAssignments: { some: { supportUserId: targetUserId } } },
            ],
          }
        : {}),
    },
    include: {
      lead: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, fullName: true } },
      supportAssignments: {
        select: {
          supportUserId: true,
        },
      },
    },
    take: 100,
  })

  // Fetch Visit Team Leaders for escalation alerts
  const leaderUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        {
          userRoles: {
            some: {
              role: {
                name: { in: [...VISIT_TEAM_LEADERSHIP_ROLES] },
              },
            },
          },
        },
        {
          userDepartments: {
            some: {
              department: { name: 'ADMIN' },
            },
          },
        },
      ],
    },
    select: { id: true },
  })

  for (const visit of visits24h) {
    const userIds = new Set<string>()
    if (visit.assignedToId) userIds.add(visit.assignedToId)
    visit.supportAssignments.forEach((s) => userIds.add(s.supportUserId))

    for (const uId of userIds) {
      if (targetUserId && uId !== targetUserId) continue

      const existing = await prisma.notification.findUnique({
        where: {
          userId_visitId_type: {
            userId: uId,
            visitId: visit.id,
            type: NotificationType.VISIT_DUE_24H,
          },
        },
      })

      if (!existing) {
        const title = '🛑 Critical: Visit Incomplete (24h Elapsed)'
        const body = `Visit with ${visit.lead.name} has crossed 24 hours without completion. This has been flagged.`

        await prisma.notification.create({
          data: {
            userId: uId,
            leadId: visit.leadId,
            visitId: visit.id,
            type: NotificationType.VISIT_DUE_24H,
            title,
            message: body,
            scheduledFor: visit.scheduledAt,
          },
        })

        await sendPushToUser(uId, title, body, {
          type: 'VISIT_DUE_24H',
          visitId: visit.id,
          leadId: visit.leadId,
        })

        notified24h++

        // Escalate to Team Leaders
        const assigneeName = visit.assignedTo?.fullName ?? 'Unassigned'
        const leaderTitle = '🛑 Leader Alert: Visit Incomplete >24h'
        const leaderBody = `${assigneeName} has not completed the visit with ${visit.lead.name} scheduled 24 hours ago.`

        for (const leader of leaderUsers) {
          if (leader.id === uId) continue // don't double notify if leader is also the assignee
          try {
            await sendPushToUser(leader.id, leaderTitle, leaderBody, {
              type: 'VISIT_DUE_24H_ESCALATION',
              visitId: visit.id,
              leadId: visit.leadId,
            })
          } catch {}
        }
      }
    }
  }

  return { notified10h, notified20h, notified24h }
}

/**
 * Checks for real-time changes in Visit Team Leaderboard rankings.
 * Sends motivating push notifications when members take the #1 spot, climb ranks, or get overtaken.
 */
export async function checkAndSendLeaderboardRankChanges(): Promise<{
  notifiedCount: number
}> {
  try {
    const { members } = await getMonthlyVisitTeamPerformance(new Date())
    const activeMembers = members.filter((m) => m.isEnabled !== false)

    if (activeMembers.length === 0) return { notifiedCount: 0 }

    let notifiedCount = 0

    // For each active member, determine their current rank (1-indexed)
    for (let index = 0; index < activeMembers.length; index++) {
      const member = activeMembers[index]
      const currentRank = index + 1

      // Find the most recent rank notification for this member this month
      const lastRankNotif = await prisma.notification.findFirst({
        where: {
          userId: member.id,
          type: NotificationType.VISIT_RANK_CHANGE,
        },
        orderBy: { createdAt: 'desc' },
      })

      // Extract previous rank from the notification message or title if available
      let previousRank: number | null = null
      if (lastRankNotif) {
        const match = lastRankNotif.message.match(/#(\d+)/)
        if (match && match[1]) {
          previousRank = parseInt(match[1], 10)
        }
      }

      // If rank changed or this is their first time reaching #1
      if (previousRank !== null && previousRank !== currentRank) {
        let title = ''
        let body = ''

        if (currentRank === 1) {
          title = "👑 You're #1 on the Leaderboard!"
          body = `Incredible work, ${member.name}! You are currently the top-performing Visit Specialist today. Keep pushing!`
        } else if (currentRank < previousRank) {
          title = `🚀 Rank Up! You're Now #${currentRank}`
          body = `Great job! You climbed from #${previousRank} to #${currentRank} on the leaderboard.`
        } else {
          title = `⚔️ Rank Alert: You dropped to #${currentRank}`
          body = `A teammate just moved ahead of you. Submit your pending visit reports to reclaim your spot!`
        }

        await prisma.notification.create({
          data: {
            userId: member.id,
            type: NotificationType.VISIT_RANK_CHANGE,
            title,
            message: body,
          },
        })

        await sendPushToUser(member.id, title, body, {
          type: 'VISIT_RANK_CHANGE',
          rank: String(currentRank),
          previousRank: String(previousRank),
        })

        notifiedCount++
      } else if (previousRank === null && currentRank === 1) {
        // First recorded time reaching #1
        const title = "👑 You're #1 on the Leaderboard!"
        const body = `Incredible work, ${member.name}! You are currently leading the Visit Team performance today.`

        await prisma.notification.create({
          data: {
            userId: member.id,
            type: NotificationType.VISIT_RANK_CHANGE,
            title,
            message: body,
          },
        })

        await sendPushToUser(member.id, title, body, {
          type: 'VISIT_RANK_CHANGE',
          rank: '1',
        })

        notifiedCount++
      }
    }

    return { notifiedCount }
  } catch (err) {
    console.error('[checkAndSendLeaderboardRankChanges] Error:', err)
    return { notifiedCount: 0 }
  }
}
