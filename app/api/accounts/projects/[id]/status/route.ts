import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import { AccountStatus } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) {
      return authResult.response
    }

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    if (!actorDepartments.has('ACCOUNTS') && !actorDepartments.has('ADMIN')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await context.params
    const leadId = resolvedParams?.id

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Invalid lead ID' }, { status: 400 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !Object.values(AccountStatus).includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { accountStatus: status as AccountStatus },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[accounts/projects/:id/status][PATCH] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update account status' },
      { status: 500 }
    )
  }
}
