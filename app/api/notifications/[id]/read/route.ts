import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

async function resolveNotificationId(context: RouteContext): Promise<string | null> {
  const resolvedParams = await context.params
  const id = resolvedParams?.id

  if (typeof id !== 'string') return null
  const trimmed = id.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function PATCH(_request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const notificationId = await resolveNotificationId(context)
    if (!notificationId) {
      return NextResponse.json({ success: false, error: 'Invalid notification id' }, { status: 400 })
    }

    const updated = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: authResult.actorUserId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    if (updated.count === 0) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    })
  } catch (error) {
    console.error('[notifications/:id/read][PATCH] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'PATCH, OPTIONS' },
  })
}
