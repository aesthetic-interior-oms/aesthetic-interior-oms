import { NextRequest, NextResponse } from 'next/server'

import { requireDatabaseRoles } from '@/lib/authz'
import { hasJrArchitectureLeadershipRole } from '@/lib/jr-architecture-roles'
import {
  getJrArchitectWorkflowControlState,
  setJrArchitectCompleteResubmissionEnabled,
} from '@/lib/jr-architect-workflow-control'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UpdateBody = {
  completeResubmissionEnabled?: unknown
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

export async function GET() {
  const authResult = await requireDatabaseRoles([])
  if (!authResult.ok) return authResult.response

  const control = await getJrArchitectWorkflowControlState()

  return NextResponse.json({
    success: true,
    data: {
      control,
    },
  })
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireDatabaseRoles([])
  if (!authResult.ok) return authResult.response

  const userDepartments = authResult.actor.userDepartments ?? []
  const isAdmin = userDepartments.includes('ADMIN')
  const isJrArchitectLeader =
    userDepartments.includes('JR_ARCHITECT') && hasJrArchitectureLeadershipRole(authResult.actorRoles)

  if (!isAdmin && !isJrArchitectLeader) {
    return NextResponse.json(
      { success: false, error: 'Only Admin or JR Architect Leader can update resubmission settings' },
      { status: 403 },
    )
  }

  let body: UpdateBody
  try {
    body = (await request.json()) as UpdateBody
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const completeResubmissionEnabled = toOptionalBoolean(body.completeResubmissionEnabled)
  if (typeof completeResubmissionEnabled !== 'boolean') {
    return NextResponse.json(
      { success: false, error: 'completeResubmissionEnabled must be a boolean' },
      { status: 400 },
    )
  }

  const control = await setJrArchitectCompleteResubmissionEnabled(completeResubmissionEnabled)

  return NextResponse.json({
    success: true,
    data: {
      control,
    },
    message: completeResubmissionEnabled
      ? 'Complete Resubmission enabled. JR Architects can upload files across any lead stage.'
      : 'Standard Resubmission enabled. JR Architects can resubmit files until Quotation phase.',
  })
}
