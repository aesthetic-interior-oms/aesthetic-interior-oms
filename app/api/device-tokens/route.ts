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

    // Upsert: if the token already exists update its userId (device re-login),
    // otherwise create it.
    await prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform: platform ?? 'android', updatedAt: new Date() },
      create: { userId, token, platform: platform ?? 'android' },
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
