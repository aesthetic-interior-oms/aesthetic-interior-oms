import { NextRequest, NextResponse } from 'next/server'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { getSeniorCrmMembers, getWeeklySeniorCrmAssignment, setWeeklySeniorCrmAssignment } from '@/lib/sr-crm-rotation'

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
  const body = await request.json() as { seniorCrmUserId?: string }
  if (!body.seniorCrmUserId) return NextResponse.json({ success: false, error: 'seniorCrmUserId required' }, { status: 400 })
  const weekly = await setWeeklySeniorCrmAssignment(body.seniorCrmUserId)

  await prisma.$transaction(async (tx) => {
    await tx.visit.updateMany({ where: { status: { in: ['SCHEDULED', 'RESCHEDULED'] } }, data: { assignedToId: body.seniorCrmUserId } })
    const leads = await tx.leadAssignment.findMany({ where: { department: 'SR_CRM' }, select: { id: true } })
    await Promise.all(leads.map((l) => tx.leadAssignment.update({ where: { id: l.id }, data: { userId: body.seniorCrmUserId } })))
  })

  return NextResponse.json({ success: true, data: weekly })
}
