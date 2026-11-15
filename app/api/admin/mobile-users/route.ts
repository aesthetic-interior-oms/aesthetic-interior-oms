import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

export const runtime = 'nodejs'

export async function GET() {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response

  // Check if caller is admin or has admin department
  const isDeptAdmin = auth.actor.userDepartments.some(
    (d) => d.trim().toUpperCase() === 'ADMIN'
  )
  const isRoleAdmin = auth.actorRoles.some((r) => {
    const norm = r.trim().toLowerCase()
    return norm === 'admin' || norm === 'super_admin' || norm === 'system_admin'
  })

  if (!isDeptAdmin && !isRoleAdmin) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Admin access required' },
      { status: 403 }
    )
  }

  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        isActive: true,
        lastMobileLoginAt: true,
        lastMobileActiveAt: true,
        mobilePlatform: true,
        mobileAppVersion: true,
        mobileDeviceModel: true,
        userRoles: {
          select: {
            role: { select: { name: true } },
          },
        },
        userDepartments: {
          select: {
            department: { select: { name: true } },
          },
        },
        deviceTokens: {
          select: {
            id: true,
            platform: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [
        { lastMobileActiveAt: 'desc' },
        { lastMobileLoginAt: 'desc' },
        { fullName: 'asc' },
      ],
    })

    const now = Date.now()
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

    let totalMobileUsers = 0
    let onlineNowCount = 0
    let activeTodayCount = 0
    let pushEnabledCount = 0
    let neverLoggedInCount = 0

    const formattedUsers = users.map((u) => {
      const roles = u.userRoles.map((r) => r.role.name)
      const departments = u.userDepartments.map((d) => d.department.name)
      const hasPushToken = u.deviceTokens.length > 0
      const hasMobileRecord = Boolean(
        u.lastMobileLoginAt || u.lastMobileActiveAt || hasPushToken
      )

      if (hasPushToken) pushEnabledCount += 1
      if (hasMobileRecord) totalMobileUsers += 1
      else neverLoggedInCount += 1

      // Determine activity status
      let status: 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE' | 'NEVER' = 'NEVER'
      let lastActiveDiffMs: number | null = null

      if (u.lastMobileActiveAt) {
        lastActiveDiffMs = now - new Date(u.lastMobileActiveAt).getTime()
        if (lastActiveDiffMs <= FIFTEEN_MINUTES_MS) {
          status = 'ONLINE'
          onlineNowCount += 1
          activeTodayCount += 1
        } else if (lastActiveDiffMs <= TWENTY_FOUR_HOURS_MS) {
          status = 'ACTIVE_TODAY'
          activeTodayCount += 1
        } else {
          status = 'OFFLINE'
        }
      } else if (u.lastMobileLoginAt) {
        const loginDiffMs = now - new Date(u.lastMobileLoginAt).getTime()
        if (loginDiffMs <= FIFTEEN_MINUTES_MS) {
          status = 'ONLINE'
          onlineNowCount += 1
          activeTodayCount += 1
        } else if (loginDiffMs <= TWENTY_FOUR_HOURS_MS) {
          status = 'ACTIVE_TODAY'
          activeTodayCount += 1
        } else {
          status = 'OFFLINE'
        }
      } else if (hasPushToken) {
        status = 'OFFLINE'
      }

      // Infer platform if not explicitly set
      const platform =
        u.mobilePlatform ||
        (u.deviceTokens.length > 0 ? u.deviceTokens[0].platform : null)

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        roles,
        departments,
        status,
        hasMobileRecord,
        hasPushToken,
        deviceTokensCount: u.deviceTokens.length,
        platform,
        appVersion: u.mobileAppVersion,
        deviceModel: u.mobileDeviceModel,
        lastMobileLoginAt: u.lastMobileLoginAt,
        lastMobileActiveAt: u.lastMobileActiveAt,
        deviceTokens: u.deviceTokens,
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: users.length,
        totalMobileUsers,
        onlineNowCount,
        activeTodayCount,
        pushEnabledCount,
        neverLoggedInCount,
      },
      users: formattedUsers,
      refreshedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[GET /api/admin/mobile-users] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mobile user statuses' },
      { status: 500 }
    )
  }
}
