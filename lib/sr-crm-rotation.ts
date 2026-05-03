import 'server-only'

import prisma from '@/lib/prisma'

function startOfWeekUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d
}

export async function getSeniorCrmMembers() {
  const department = await prisma.department.findUnique({
    where: { name: 'SR_CRM' },
    select: { userDepartments: { select: { user: { select: { id: true, fullName: true, email: true } } }, orderBy: { user: { fullName: 'asc' } } } },
  })
  return (department?.userDepartments ?? []).map((row) => row.user)
}

export async function getWeeklySeniorCrmAssignment() {
  const [control, seniors] = await Promise.all([
    prisma.visitWorkflowControl.upsert({ where: { id: 'default' }, create: { id: 'default' }, update: {} }),
    getSeniorCrmMembers(),
  ])
  if (seniors.length === 0) return { current: null, next: null, weekStart: startOfWeekUtc(new Date()) }

  const weekStart = startOfWeekUtc(new Date())
  const sameWeek = control.weeklySeniorCrmWeekStart && startOfWeekUtc(control.weeklySeniorCrmWeekStart).getTime() === weekStart.getTime()
  const existingIndex = seniors.findIndex((s) => s.id === control.weeklySeniorCrmUserId)
  let currentIndex = sameWeek && existingIndex >= 0 ? existingIndex : 0
  if (!sameWeek && existingIndex >= 0) currentIndex = (existingIndex + 1) % seniors.length

  const current = seniors[currentIndex]
  const next = seniors[(currentIndex + 1) % seniors.length]

  if (!sameWeek || control.weeklySeniorCrmUserId !== current.id) {
    await prisma.visitWorkflowControl.update({ where: { id: 'default' }, data: { weeklySeniorCrmUserId: current.id, weeklySeniorCrmWeekStart: weekStart } })
  }

  return { current, next, weekStart }
}

export async function setWeeklySeniorCrmAssignment(userId: string) {
  const weekStart = startOfWeekUtc(new Date())
  await prisma.visitWorkflowControl.update({ where: { id: 'default' }, data: { weeklySeniorCrmUserId: userId, weeklySeniorCrmWeekStart: weekStart } })
  return getWeeklySeniorCrmAssignment()
}
