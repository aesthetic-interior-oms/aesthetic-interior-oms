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
        lastWebLoginAt: true,
        lastWebActiveAt: true,
        mobilePlatform: true,
        mobileAppVersion: true,
        mobileDeviceModel: true,
        clerkUserId: true,
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
        { lastWebActiveAt: 'desc' },
        { lastMobileActiveAt: 'desc' },
        { fullName: 'asc' },
      ],
    })

    const now = Date.now()
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

    let totalMobileUsers = 0
    let totalWebUsers = 0
    let totalOnlineNowCount = 0
    let mobileOnlineNowCount = 0
    let webOnlineNowCount = 0
    let activeTodayCount = 0
    let pushEnabledCount = 0
    let inactiveTodayCount = 0

    // Department-level statistics map
    const departmentStats: Record<
      string,
      {
        name: string
        totalUsers: number
        totalMobile: number
        totalWeb: number
        onlineNow: number
        webOnline: number
        mobileOnline: number
        activeToday: number
      }
    > = {}

    const formattedUsers = users.map((u) => {
      const roles = u.userRoles.map((r) => r.role.name)
      const departments = u.userDepartments.map((d) => d.department.name)
      const primaryDepartment = departments[0] || 'Unassigned'
      const hasPushToken = u.deviceTokens.length > 0

      // ── MOBILE ACTIVITY CALCULATIONS ──────────────────────────────
      const lastProcTx = u.procurementWalletTxSubmitted[0]?.createdAt ?? null
      const lastDelivery = u.siteDeliveriesReceived[0]?.createdAt ?? null
      let fallbackMobileActivity: Date | null = null
      if (lastProcTx) fallbackMobileActivity = lastProcTx
      if (lastDelivery) {
        if (!fallbackMobileActivity || lastDelivery.getTime() > fallbackMobileActivity.getTime()) {
          fallbackMobileActivity = lastDelivery
        }
      }

      const effectiveMobileActive = u.lastMobileActiveAt || fallbackMobileActivity
      const effectiveMobileLogin = u.lastMobileLoginAt || fallbackMobileActivity

      const hasMobileRecord = Boolean(effectiveMobileLogin || effectiveMobileActive || hasPushToken)
      if (hasPushToken) pushEnabledCount += 1
      if (hasMobileRecord) totalMobileUsers += 1

      let mobileStatus: 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE' | 'NEVER' = 'NEVER'
      if (effectiveMobileActive) {
        const diffMs = now - new Date(effectiveMobileActive).getTime()
        if (diffMs <= FIFTEEN_MINUTES_MS) {
          mobileStatus = 'ONLINE'
          mobileOnlineNowCount += 1
        } else if (diffMs <= TWENTY_FOUR_HOURS_MS) {
          mobileStatus = 'ACTIVE_TODAY'
        } else {
          mobileStatus = 'OFFLINE'
        }
      } else if (effectiveMobileLogin) {
        const diffMs = now - new Date(effectiveMobileLogin).getTime()
        if (diffMs <= FIFTEEN_MINUTES_MS) {
          mobileStatus = 'ONLINE'
          mobileOnlineNowCount += 1
        } else if (diffMs <= TWENTY_FOUR_HOURS_MS) {
          mobileStatus = 'ACTIVE_TODAY'
        } else {
          mobileStatus = 'OFFLINE'
        }
      } else if (hasPushToken) {
        mobileStatus = 'OFFLINE'
      }

      // ── WEB APP ACTIVITY CALCULATIONS ─────────────────────────────
      const hasWebRecord = Boolean(u.lastWebLoginAt || u.lastWebActiveAt || u.clerkUserId)
      if (hasWebRecord) totalWebUsers += 1

      let webStatus: 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE' | 'NEVER' = 'NEVER'
      if (u.lastWebActiveAt) {
        const diffMs = now - new Date(u.lastWebActiveAt).getTime()
        if (diffMs <= FIFTEEN_MINUTES_MS) {
          webStatus = 'ONLINE'
          webOnlineNowCount += 1
        } else if (diffMs <= TWENTY_FOUR_HOURS_MS) {
          webStatus = 'ACTIVE_TODAY'
        } else {
          webStatus = 'OFFLINE'
        }
      } else if (u.lastWebLoginAt) {
        const diffMs = now - new Date(u.lastWebLoginAt).getTime()
        if (diffMs <= FIFTEEN_MINUTES_MS) {
          webStatus = 'ONLINE'
          webOnlineNowCount += 1
        } else if (diffMs <= TWENTY_FOUR_HOURS_MS) {
          webStatus = 'ACTIVE_TODAY'
        } else {
          webStatus = 'OFFLINE'
        }
      } else if (u.clerkUserId) {
        webStatus = 'OFFLINE'
      }

      // ── COMBINED PRESENCE / OVERALL STATUS ─────────────────────────
      const isMobileOnline = mobileStatus === 'ONLINE'
      const isWebOnline = webStatus === 'ONLINE'
      const isOnline = isMobileOnline || isWebOnline

      let activeDevice: 'BOTH' | 'MOBILE' | 'WEB' | 'NONE' = 'NONE'
      if (isMobileOnline && isWebOnline) activeDevice = 'BOTH'
      else if (isMobileOnline) activeDevice = 'MOBILE'
      else if (isWebOnline) activeDevice = 'WEB'

      let overallStatus: 'ONLINE' | 'ACTIVE_TODAY' | 'OFFLINE' | 'NEVER' = 'NEVER'
      if (isOnline) {
        overallStatus = 'ONLINE'
        totalOnlineNowCount += 1
        activeTodayCount += 1
      } else if (mobileStatus === 'ACTIVE_TODAY' || webStatus === 'ACTIVE_TODAY') {
        overallStatus = 'ACTIVE_TODAY'
        activeTodayCount += 1
      } else if (hasMobileRecord || hasWebRecord) {
        overallStatus = 'OFFLINE'
        inactiveTodayCount += 1
      } else {
        overallStatus = 'NEVER'
        inactiveTodayCount += 1
      }

      // Get latest active timestamp across web & mobile
      let latestActiveAt: string | null = null
      const mobTime = effectiveMobileActive ? new Date(effectiveMobileActive).getTime() : 0
      const webTime = u.lastWebActiveAt ? new Date(u.lastWebActiveAt).getTime() : 0
      if (mobTime > 0 || webTime > 0) {
        latestActiveAt = new Date(Math.max(mobTime, webTime)).toISOString()
      }

      // Infer platform
      const platform =
        u.mobilePlatform ||
        (u.deviceTokens.length > 0 ? u.deviceTokens[0].platform : fallbackMobileActivity ? 'android' : null)

      // Accumulate department stats
      const targetDepts = departments.length > 0 ? departments : ['Unassigned']
      targetDepts.forEach((dept) => {
        if (!departmentStats[dept]) {
          departmentStats[dept] = {
            name: dept,
            totalUsers: 0,
            totalMobile: 0,
            totalWeb: 0,
            onlineNow: 0,
            webOnline: 0,
            mobileOnline: 0,
            activeToday: 0,
          }
        }
        departmentStats[dept].totalUsers += 1
        if (hasMobileRecord) departmentStats[dept].totalMobile += 1
        if (hasWebRecord) departmentStats[dept].totalWeb += 1
        if (isOnline) departmentStats[dept].onlineNow += 1
        if (isWebOnline) departmentStats[dept].webOnline += 1
        if (isMobileOnline) departmentStats[dept].mobileOnline += 1
        if (overallStatus === 'ONLINE' || overallStatus === 'ACTIVE_TODAY') {
          departmentStats[dept].activeToday += 1
        }
      })

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        roles,
        departments,
        primaryDepartment,
        // Combined
        overallStatus,
        status: overallStatus, // backwards compatibility
        activeDevice,
        latestActiveAt,
        // Mobile details
        mobileStatus,
        hasMobileRecord,
        hasPushToken,
        deviceTokensCount: u.deviceTokens.length,
        platform,
        appVersion: u.mobileAppVersion,
        deviceModel: u.mobileDeviceModel,
        lastMobileLoginAt: effectiveMobileLogin ? new Date(effectiveMobileLogin).toISOString() : null,
        lastMobileActiveAt: effectiveMobileActive ? new Date(effectiveMobileActive).toISOString() : null,
        deviceTokens: u.deviceTokens,
        // Web details
        webStatus,
        hasWebRecord,
        lastWebLoginAt: u.lastWebLoginAt ? new Date(u.lastWebLoginAt).toISOString() : null,
        lastWebActiveAt: u.lastWebActiveAt ? new Date(u.lastWebActiveAt).toISOString() : null,
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: users.length,
        totalOnlineNowCount,
        onlineNowCount: totalOnlineNowCount, // backwards compatibility
        webOnlineNowCount,
        mobileOnlineNowCount,
        activeTodayCount,
        totalMobileUsers,
        totalWebUsers,
        pushEnabledCount,
        inactiveTodayCount,
        neverLoggedInCount: inactiveTodayCount, // backwards compatibility
      },
      departmentStats: Object.values(departmentStats).sort((a, b) => b.onlineNow - a.onlineNow || b.totalUsers - a.totalUsers),
      users: formattedUsers,
      refreshedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[GET /api/admin/mobile-users] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team activity and user statuses' },
      { status: 500 }
    )
  }
}
