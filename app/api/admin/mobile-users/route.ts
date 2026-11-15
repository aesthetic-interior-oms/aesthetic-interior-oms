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
        procurementWalletTxSubmitted: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        },
        siteDeliveriesReceived: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
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

    // Department-level statistics map
    const departmentStats: Record<
      string,
      { name: string; totalUsers: number; totalMobile: number; onlineNow: number; activeToday: number }
    > = {}

    const formattedUsers = users.map((u) => {
      const roles = u.userRoles.map((r) => r.role.name)
      const departments = u.userDepartments.map((d) => d.department.name)
      const primaryDepartment = departments[0] || 'Unassigned'
      const hasPushToken = u.deviceTokens.length > 0

      // Infer fallback activity from mobile actions if lastMobileActiveAt is not yet set
      const lastProcTx = u.procurementWalletTxSubmitted[0]?.createdAt ?? null
      const lastDelivery = u.siteDeliveriesReceived[0]?.createdAt ?? null
      let fallbackActivity: Date | null = null
      if (lastProcTx) {
        fallbackActivity = lastProcTx
      }
      if (lastDelivery) {
        if (!fallbackActivity || lastDelivery.getTime() > fallbackActivity.getTime()) {
          fallbackActivity = lastDelivery
        }
      }

      const effectiveLastActive = u.lastMobileActiveAt || fallbackActivity
      const effectiveLastLogin = u.lastMobileLoginAt || fallbackActivity

      // If we found a fallback activity but DB hasn't persisted it, update in background
      if (fallbackActivity && !u.lastMobileActiveAt) {
        prisma.user.update({
          where: { id: u.id },
          data: {
            lastMobileActiveAt: fallbackActivity,
            ...(u.lastMobileLoginAt ? {} : { lastMobileLoginAt: fallbackActivity }),
            ...(u.mobilePlatform ? {} : { mobilePlatform: 'android' }),
          },
        }).catch(() => {})
      }

      const hasMobileRecord = Boolean(
        effectiveLastLogin || effectiveLastActive || hasPushToken
      )

      if (hasPushToken) pushEnabledCount += 1
      if (hasMobileRecord) totalMobileUsers += 1
      else neverLoggedInCount += 1

      // Determine activity status
      let status: 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE' | 'NEVER' = 'NEVER'
      let lastActiveDiffMs: number | null = null

      if (effectiveLastActive) {
        lastActiveDiffMs = now - new Date(effectiveLastActive).getTime()
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
      } else if (effectiveLastLogin) {
        const loginDiffMs = now - new Date(effectiveLastLogin).getTime()
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
        (u.deviceTokens.length > 0 ? u.deviceTokens[0].platform : fallbackActivity ? 'android' : null)

      // Accumulate department stats
      departments.forEach((dept) => {
        if (!departmentStats[dept]) {
          departmentStats[dept] = {
            name: dept,
            totalUsers: 0,
            totalMobile: 0,
            onlineNow: 0,
            activeToday: 0,
          }
        }
        departmentStats[dept].totalUsers += 1
        if (hasMobileRecord) departmentStats[dept].totalMobile += 1
        if (status === 'ONLINE') departmentStats[dept].onlineNow += 1
        if (status === 'ONLINE' || status === 'ACTIVE_TODAY') departmentStats[dept].activeToday += 1
      })

      if (departments.length === 0) {
        const unassigned = 'Unassigned'
        if (!departmentStats[unassigned]) {
          departmentStats[unassigned] = {
            name: unassigned,
            totalUsers: 0,
            totalMobile: 0,
            onlineNow: 0,
            activeToday: 0,
          }
        }
        departmentStats[unassigned].totalUsers += 1
        if (hasMobileRecord) departmentStats[unassigned].totalMobile += 1
        if (status === 'ONLINE') departmentStats[unassigned].onlineNow += 1
        if (status === 'ONLINE' || status === 'ACTIVE_TODAY') departmentStats[unassigned].activeToday += 1
      }

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        roles,
        departments,
        primaryDepartment,
        status,
        hasMobileRecord,
        hasPushToken,
        deviceTokensCount: u.deviceTokens.length,
        platform,
        appVersion: u.mobileAppVersion,
        deviceModel: u.mobileDeviceModel,
        lastMobileLoginAt: effectiveLastLogin ? new Date(effectiveLastLogin).toISOString() : null,
        lastMobileActiveAt: effectiveLastActive ? new Date(effectiveLastActive).toISOString() : null,
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
      departmentStats: Object.values(departmentStats).sort((a, b) => b.totalMobile - a.totalMobile),
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
