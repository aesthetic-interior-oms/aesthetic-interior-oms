import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'

// POST /api/device-tokens — register or refresh FCM token
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const userId = authResult.actorUserId
    const body = await request.json()
    const { token, platform } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'token is required' },
        { status: 400 },
      )
    }

    // 1. Delete this token if it already exists (e.g. from a previous user logging out without unregistering).
    // This prevents the Prisma Unique Constraint (P2002) failure on the 'token' field.
    await prisma.deviceToken.deleteMany({ where: { token } })

    // 2. Delete any old tokens for this user+platform so we only keep the latest per platform.
    await prisma.deviceToken.deleteMany({ where: { userId, platform: platform ?? 'android' } })

    // 3. Insert the fresh token for the current user.
    await prisma.deviceToken.create({
      data: { userId, token, platform: platform ?? 'android' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[device-tokens][POST] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to register device token' },
      { status: 500 },
    )
  }
}

// DELETE /api/device-tokens — unregister FCM token on logout
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'token is required' },
        { status: 400 },
      )
    }

    await prisma.deviceToken.deleteMany({
      where: { token, userId: authResult.actorUserId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[device-tokens][DELETE] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to unregister device token' },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST, DELETE, OPTIONS' },
  })
}
