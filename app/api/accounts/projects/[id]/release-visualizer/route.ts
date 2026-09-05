import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { sendPushToUser } from '@/lib/fcm-service'
import { releaseVisualizerAfterPaymentGate } from '@/lib/visualizer-release'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles(['ADMIN'])
    if (!authResult.ok) return authResult.response

    const { id: leadId } = await context.params
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid lead ID' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as { reason?: unknown }
    const reason = toOptionalString(body.reason)

    const visualizerRelease = await prisma.$transaction((tx) =>
      releaseVisualizerAfterPaymentGate({
        tx,
        leadId,
        actorUserId: authResult.actorUserId,
        bypassPayment: true,
        reason,
      }),
    )

    if (!visualizerRelease.released) {
      return NextResponse.json(
        { success: false, error: visualizerRelease.message, visualizerRelease },
        { status: 409 },
      )
    }

    if (visualizerRelease.visualizerUserId) {
      sendPushToUser(
        visualizerRelease.visualizerUserId,
        '3D Visualizer work released',
        `${visualizerRelease.leadName ?? 'Project'} is ready for 3D visualization.`,
        { type: 'VISUALIZER_RELEASED', leadId: visualizerRelease.leadId },
      ).catch((pushErr) => console.error('[accounts/projects/:id/release-visualizer] push failed', pushErr))
    }

    return NextResponse.json({
      success: true,
      visualizerRelease,
      message: visualizerRelease.message,
    })
  } catch (error) {
    console.error('[accounts/projects/:id/release-visualizer][POST] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to release 3D Visualizer'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
