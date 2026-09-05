import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { requestVisualizerReleaseApproval } from '@/lib/visualizer-release'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    if (!actorDepartments.has('ACCOUNTS') && !actorDepartments.has('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { id: leadId } = await context.params
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid lead ID' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as { reason?: unknown }
    const reason = toOptionalString(body.reason)

    const result = await prisma.$transaction((tx) =>
      requestVisualizerReleaseApproval({
        tx,
        leadId,
        actorUserId: authResult.actorUserId,
        reason,
      }),
    )

    return NextResponse.json({
      success: true,
      message: `Admin approval request sent to ${result.adminCount} admin${result.adminCount === 1 ? '' : 's'}.`,
    })
  } catch (error) {
    console.error('[accounts/projects/:id/visualizer-release-request][POST] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to request admin approval'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
