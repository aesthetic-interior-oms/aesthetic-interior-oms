import { NextRequest, NextResponse } from 'next/server'
import { NotificationType } from '@/generated/prisma/client'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { sendPushToUser } from '@/lib/fcm-service'

function toPositiveInt(value: string | null, fallback: number, max: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), max)
}

async function ensureFollowupDueNotifications(userId: string) {
  const now = new Date()
  const reminderWindowEnd = new Date(now.getTime() + 15 * 60 * 1000)

  const reminderFollowups = await prisma.followUp.findMany({
    where: {
      assignedToId: userId,
      status: 'PENDING',
      followupDate: { gt: now, lte: reminderWindowEnd },
      notifications: {
        none: {
          userId,
          type: NotificationType.FOLLOWUP_REMINDER_15M,
        },
      },
    },
    include: {
      lead: {
        select: { id: true, name: true },
      },
    },
    take: 100,
    orderBy: { followupDate: 'asc' },
  })

  const dueFollowups = await prisma.followUp.findMany({
    where: {
      assignedToId: userId,
      status: 'PENDING',
      followupDate: { lte: now },
      notifications: {
        none: {
          userId,
          type: NotificationType.FOLLOWUP_DUE,
        },
      },
    },
    include: {
      lead: {
        select: { id: true, name: true },
      },
    },
    take: 100,
    orderBy: { followupDate: 'asc' },
  })

  if (reminderFollowups.length === 0 && dueFollowups.length === 0) return

  if (reminderFollowups.length > 0) {
    await prisma.notification.createMany({
      data: reminderFollowups.map((followup) => ({
        userId,
        leadId: followup.leadId,
        followUpId: followup.id,
        type: NotificationType.FOLLOWUP_REMINDER_15M,
        title: 'Follow-up in 15 minutes',
        message: `Upcoming follow-up for ${followup.lead.name}.`,
        scheduledFor: followup.followupDate,
      })),
      skipDuplicates: true,
    })

    // Send FCM push notifications in parallel (don't block the HTTP request)
    Promise.allSettled(
      reminderFollowups.map((f) =>
        sendPushToUser(
          userId,
          'Follow-up in 15 minutes',
          `Upcoming follow-up for ${f.lead.name}.`,
          { type: 'FOLLOWUP_REMINDER_15M', leadId: f.leadId },
        ),
      ),
    ).catch((err) => console.error('[notifications] FCM reminderFollowups push failed:', err))
  }

  if (dueFollowups.length > 0) {
    await prisma.notification.createMany({
      data: dueFollowups.map((followup) => ({
        userId,
        leadId: followup.leadId,
        followUpId: followup.id,
        type: NotificationType.FOLLOWUP_DUE,
        title: 'Follow-up due',
        message: `Follow-up for ${followup.lead.name} is due now.`,
        scheduledFor: followup.followupDate,
      })),
      skipDuplicates: true,
    })

    // Send FCM push notifications in parallel (don't block the HTTP request)
    Promise.allSettled(
      dueFollowups.map((f) =>
        sendPushToUser(
          userId,
          'Follow-up due',
          `Follow-up for ${f.lead.name} is due now.`,
          { type: 'FOLLOWUP_DUE', leadId: f.leadId },
        ),
      ),
    ).catch((err) => console.error('[notifications] FCM dueFollowups push failed:', err))
  }
}

async function ensureVisitScheduleNotifications(userId: string) {
  const now = new Date()
  const reminderWindowEnd = new Date(now.getTime() + 30 * 60 * 1000)

  const reminderVisits = await prisma.visit.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { gt: now, lte: reminderWindowEnd },
      OR: [
        { assignedToId: userId },
        { supportAssignments: { some: { supportUserId: userId } } },
      ],
      notifications: {
        none: {
          userId,
          type: NotificationType.VISIT_REMINDER_30M,
        },
      },
    },
    select: {
      id: true,
      leadId: true,
      scheduledAt: true,
      lead: {
        select: { id: true, name: true },
      },
    },
    take: 100,
    orderBy: { scheduledAt: 'asc' },
  })

  const dueVisits = await prisma.visit.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
      OR: [
        { assignedToId: userId },
        { supportAssignments: { some: { supportUserId: userId } } },
      ],
      notifications: {
        none: {
          userId,
          type: NotificationType.VISIT_DUE,
        },
      },
    },
    select: {
      id: true,
      leadId: true,
      scheduledAt: true,
      lead: {
        select: { id: true, name: true },
      },
    },
    take: 100,
    orderBy: { scheduledAt: 'asc' },
  })

  const due36hVisits = await prisma.visit.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: new Date(now.getTime() - 36 * 60 * 60 * 1000) },
      OR: [
        { assignedToId: userId },
        { supportAssignments: { some: { supportUserId: userId } } },
      ],
      notifications: {
        none: {
          userId,
          type: NotificationType.VISIT_DUE_36H,
        },
      },
    },
    select: {
      id: true,
      leadId: true,
      scheduledAt: true,
      lead: {
        select: { id: true, name: true },
      },
    },
    take: 100,
    orderBy: { scheduledAt: 'asc' },
  })

  const due48hVisits = await prisma.visit.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
      OR: [
        { assignedToId: userId },
        { supportAssignments: { some: { supportUserId: userId } } },
      ],
      notifications: {
        none: {
          userId,
          type: NotificationType.VISIT_DUE_48H,
        },
      },
    },
    select: {
      id: true,
      leadId: true,
      scheduledAt: true,
      lead: {
        select: { id: true, name: true },
      },
    },
    take: 100,
    orderBy: { scheduledAt: 'asc' },
  })

  const due72hVisits = await prisma.visit.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: new Date(now.getTime() - 72 * 60 * 60 * 1000) },
      OR: [
        { assignedToId: userId },
        { supportAssignments: { some: { supportUserId: userId } } },
      ],
      notifications: {
        none: {
          userId,
          type: NotificationType.VISIT_DUE_72H,
        },
      },
    },
    select: {
      id: true,
      leadId: true,
      scheduledAt: true,
      lead: {
        select: { id: true, name: true },
      },
    },
    take: 100,
    orderBy: { scheduledAt: 'asc' },
  })

  if (
    reminderVisits.length === 0 &&
    dueVisits.length === 0 &&
    due36hVisits.length === 0 &&
    due48hVisits.length === 0 &&
    due72hVisits.length === 0
  )
    return

  if (reminderVisits.length > 0) {
    await prisma.notification.createMany({
      data: reminderVisits.map((visit) => ({
        userId,
        leadId: visit.leadId,
        visitId: visit.id,
        type: NotificationType.VISIT_REMINDER_30M,
        title: 'Visit in 30 minutes',
        message: `Upcoming visit for ${visit.lead.name}.`,
        scheduledFor: visit.scheduledAt,
      })),
      skipDuplicates: true,
    })

    // Send FCM push notifications in parallel (don't block the HTTP request)
    Promise.allSettled(
      reminderVisits.map((v) =>
        sendPushToUser(
          userId,
          'Visit in 30 minutes',
          `Upcoming visit for ${v.lead.name}.`,
          { type: 'VISIT_REMINDER_30M', leadId: v.leadId },
        ),
      ),
    ).catch((err) => console.error('[notifications] FCM reminderVisits push failed:', err))
  }

  if (dueVisits.length > 0) {
    await prisma.notification.createMany({
      data: dueVisits.map((visit) => ({
        userId,
        leadId: visit.leadId,
        visitId: visit.id,
        type: NotificationType.VISIT_DUE,
        title: 'Visit due now',
        message: `Visit for ${visit.lead.name} is due now.`,
        scheduledFor: visit.scheduledAt,
      })),
      skipDuplicates: true,
    })

    // Send FCM push notifications in parallel (don't block the HTTP request)
    Promise.allSettled(
      dueVisits.map((v) =>
        sendPushToUser(
          userId,
          'Visit due now',
          `Visit for ${v.lead.name} is due now.`,
          { type: 'VISIT_DUE', leadId: v.leadId },
        ),
      ),
    ).catch((err) => console.error('[notifications] FCM dueVisits push failed:', err))
  }

  if (due36hVisits.length > 0) {
    await prisma.notification.createMany({
      data: due36hVisits.map((visit) => ({
        userId,
        leadId: visit.leadId,
        visitId: visit.id,
        type: NotificationType.VISIT_DUE_36H,
        title: 'Visit 36h Overdue',
        message: `Visit for ${visit.lead.name} has been overdue for 36 hours.`,
        scheduledFor: visit.scheduledAt,
      })),
      skipDuplicates: true,
    })

    // Send FCM push notifications in parallel
    Promise.allSettled(
      due36hVisits.map((v) =>
        sendPushToUser(
          userId,
          'Visit 36h Overdue',
          `Visit for ${v.lead.name} has been overdue for 36 hours.`,
          { type: 'VISIT_DUE_36H', leadId: v.leadId },
        ),
      ),
    ).catch((err) => console.error('[notifications] FCM due36hVisits push failed:', err))
  }

  if (due48hVisits.length > 0) {
    await prisma.notification.createMany({
      data: due48hVisits.map((visit) => ({
        userId,
        leadId: visit.leadId,
        visitId: visit.id,
        type: NotificationType.VISIT_DUE_48H,
        title: 'Visit 48h Overdue',
        message: `Visit for ${visit.lead.name} has been overdue for 48 hours.`,
        scheduledFor: visit.scheduledAt,
      })),
      skipDuplicates: true,
    })

    // Send FCM push notifications in parallel
    Promise.allSettled(
      due48hVisits.map((v) =>
        sendPushToUser(
          userId,
          'Visit 48h Overdue',
          `Visit for ${v.lead.name} has been overdue for 48 hours.`,
          { type: 'VISIT_DUE_48H', leadId: v.leadId },
        ),
      ),
    ).catch((err) => console.error('[notifications] FCM due48hVisits push failed:', err))
  }

  if (due72hVisits.length > 0) {
    await prisma.notification.createMany({
      data: due72hVisits.map((visit) => ({
        userId,
        leadId: visit.leadId,
        visitId: visit.id,
        type: NotificationType.VISIT_DUE_72H,
        title: 'Visit 72h Overdue',
        message: `Visit for ${visit.lead.name} has been overdue for 72 hours.`,
        scheduledFor: visit.scheduledAt,
      })),
      skipDuplicates: true,
    })

    // Send FCM push notifications in parallel
    Promise.allSettled(
      due72hVisits.map((v) =>
        sendPushToUser(
          userId,
          'Visit 72h Overdue',
          `Visit for ${v.lead.name} has been overdue for 72 hours.`,
          { type: 'VISIT_DUE_72H', leadId: v.leadId },
        ),
      ),
    ).catch((err) => console.error('[notifications] FCM due72hVisits push failed:', err))
  }
}

async function ensureSignupApprovalNotifications(userId: string, isAdmin: boolean) {
  if (!isAdmin) return

  const pendingUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      userDepartments: { none: {} },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      created_at: true,
    },
    take: 100,
    orderBy: { created_at: 'desc' },
  })

  if (pendingUsers.length === 0) return

  await prisma.notification.createMany({
    data: pendingUsers.map((pending) => ({
      userId,
      subjectUserId: pending.id,
      type: NotificationType.SIGNUP_PENDING_APPROVAL,
      title: 'New signup pending approval',
      message: `${pending.fullName} (${pending.email}) is waiting for admin approval.`,
      scheduledFor: pending.created_at,
    })),
    skipDuplicates: true,
  })
}

async function clearOrphanFollowupNotifications(userId: string) {
  await prisma.notification.deleteMany({
    where: {
      userId,
      type: {
        in: [NotificationType.FOLLOWUP_DUE, NotificationType.FOLLOWUP_REMINDER_15M],
      },
      OR: [{ leadId: null }, { followUpId: null }],
    },
  })

  await prisma.notification.deleteMany({
    where: {
      userId,
      type: {
        in: [
          NotificationType.VISIT_DUE,
          NotificationType.VISIT_REMINDER_30M,
          NotificationType.VISIT_ASSIGNED,
          NotificationType.VISIT_DUE_36H,
          NotificationType.VISIT_DUE_48H,
          NotificationType.VISIT_DUE_72H,
        ],
      },
      OR: [{ leadId: null }, { visitId: null }],
    },
  })

  await prisma.notification.deleteMany({
    where: {
      userId,
      type: NotificationType.SIGNUP_PENDING_APPROVAL,
      OR: [
        { subjectUserId: null },
        {
          subjectUser: {
            OR: [
              { isActive: false },
              { userDepartments: { some: {} } },
            ],
          },
        },
      ],
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const userId = authResult.actorUserId
    const isAdmin = authResult.actor.userDepartments.includes('ADMIN')
    const limit = toPositiveInt(request.nextUrl.searchParams.get('limit'), 20, 100)

    await clearOrphanFollowupNotifications(userId)
    await ensureFollowupDueNotifications(userId)
    await ensureVisitScheduleNotifications(userId)
    await ensureSignupApprovalNotifications(userId, isAdmin)

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        include: {
          lead: {
            select: { id: true, name: true },
          },
          followUp: {
            select: { id: true, followupDate: true, status: true },
          },
          visit: {
            select: { id: true, scheduledAt: true, status: true },
          },
          subjectUser: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        items,
        unreadCount,
      },
    })
  } catch (error) {
    console.error('[notifications][GET] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 },
    )
  }
}

export async function PATCH() {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    await prisma.notification.updateMany({
      where: {
        userId: authResult.actorUserId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
    })
  } catch (error) {
    console.error('[notifications][PATCH] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, PATCH, OPTIONS' },
  })
}
