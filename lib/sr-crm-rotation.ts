import 'server-only'

import prisma from '@/lib/prisma'

const SETTINGS_ROW_ID = 'default'

function startOfWeekUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  const daysSinceSaturday = (day + 1) % 7
  d.setUTCDate(d.getUTCDate() - daysSinceSaturday)
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
    prisma.visitWorkflowControl.upsert({ where: { id: SETTINGS_ROW_ID }, create: { id: SETTINGS_ROW_ID }, update: {} }),
    getSeniorCrmMembers(),
  ])
  const weekStart = startOfWeekUtc(new Date())
  const automationEnabled = control.weeklySeniorCrmAutomationEnabled

  if (seniors.length === 0) {
    return {
      automationEnabled,
      current: null,
      selected: null,
      next: null,
      weekStart,
    }
  }

  const sameWeek = control.weeklySeniorCrmWeekStart && startOfWeekUtc(control.weeklySeniorCrmWeekStart).getTime() === weekStart.getTime()
  const existingIndex = seniors.findIndex((s) => s.id === control.weeklySeniorCrmUserId)
  let currentIndex = sameWeek && existingIndex >= 0 ? existingIndex : 0
  if (!sameWeek && existingIndex >= 0) currentIndex = (existingIndex + 1) % seniors.length

  const selected = existingIndex >= 0 ? seniors[existingIndex] : null
  const current = seniors[currentIndex]
  const next = seniors[(currentIndex + 1) % seniors.length]

  if (automationEnabled && (!sameWeek || control.weeklySeniorCrmUserId !== current.id)) {
    await prisma.visitWorkflowControl.update({
      where: { id: SETTINGS_ROW_ID },
      data: { weeklySeniorCrmUserId: current.id, weeklySeniorCrmWeekStart: weekStart },
    })
  }

  return {
    automationEnabled,
    current: automationEnabled ? current : null,
    selected: automationEnabled ? current : selected,
    next: automationEnabled ? next : null,
    weekStart,
  }
}

export async function setWeeklySeniorCrmAutomationSettings({
  automationEnabled,
  userId,
}: {
  automationEnabled: boolean
  userId?: string
}) {
  const weekStart = startOfWeekUtc(new Date())
  const data: {
    weeklySeniorCrmAutomationEnabled: boolean
    weeklySeniorCrmWeekStart: Date
    weeklySeniorCrmUserId?: string
  } = {
    weeklySeniorCrmAutomationEnabled: automationEnabled,
    weeklySeniorCrmWeekStart: weekStart,
  }

  if (userId) {
    data.weeklySeniorCrmUserId = userId
  }

  await prisma.visitWorkflowControl.update({ where: { id: SETTINGS_ROW_ID }, data })
  return getWeeklySeniorCrmAssignment()
}

