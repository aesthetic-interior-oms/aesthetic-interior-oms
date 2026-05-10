import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import {
  getSeniorCrmMembers,
  getWeeklySeniorCrmAssignment,
  setWeeklySeniorCrmAutomationSettings,
} from '@/lib/sr-crm-rotation'

export async function GET() {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response
  const data = await getWeeklySeniorCrmAssignment()
  const seniors = await getSeniorCrmMembers()
  return NextResponse.json({ success: true, data: { ...data, seniors } })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response
  if (!auth.actor.userDepartments.includes('ADMIN')) return NextResponse.json({ success: false, error: 'Only admin can update' }, { status: 403 })
  const body = await request.json() as { seniorCrmUserId?: unknown; automationEnabled?: unknown }
  const automationEnabled = typeof body.automationEnabled === 'boolean' ? body.automationEnabled : true
  const seniorCrmUserId = typeof body.seniorCrmUserId === 'string' ? body.seniorCrmUserId.trim() : ''

  if (automationEnabled && !seniorCrmUserId) {
    return NextResponse.json({ success: false, error: 'seniorCrmUserId required when automation is enabled' }, { status: 400 })
  }

  if (seniorCrmUserId) {
    const seniors = await getSeniorCrmMembers()
    const isSeniorCrm = seniors.some((senior) => senior.id === seniorCrmUserId)
    if (!isSeniorCrm) {
      return NextResponse.json({ success: false, error: 'Selected user must be a Senior CRM member' }, { status: 400 })
    }
  }

  const weekly = await setWeeklySeniorCrmAutomationSettings({
    automationEnabled,
    userId: seniorCrmUserId || undefined,
  })
  const seniors = await getSeniorCrmMembers()

  return NextResponse.json({
    success: true,
    data: { ...weekly, seniors },
    message: automationEnabled
      ? 'Weekly Senior CRM auto suggestion updated'
      : 'Weekly Senior CRM auto suggestion disabled',
  })
}
