import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function getConveyanceActor() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null
  return prisma.user.findUnique({
    where: { clerkUserId },
    select: {
      id: true,
      fullName: true,
      userDepartments: { select: { department: { select: { name: true } } } },
    },
  })
}

export function isConveyanceAccounts(actor: NonNullable<Awaited<ReturnType<typeof getConveyanceActor>>>) {
  const departments = actor.userDepartments.map((row) => row.department.name.trim().toUpperCase())
  return departments.includes('ACCOUNTS') || departments.includes('ADMIN')
}

export function canRequestConveyance(actor: NonNullable<Awaited<ReturnType<typeof getConveyanceActor>>>) {
  return !actor.userDepartments.some((row) => row.department.name.trim().toUpperCase() === 'ACCOUNTS')
}

export function parseConveyanceRange(startValue: string | null, endValue: string | null) {
  const now = new Date()
  const end = endValue ? new Date(`${endValue}T00:00:00.000Z`) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const start = startValue ? new Date(`${startValue}T00:00:00.000Z`) : new Date(end.getTime() - 7 * 86400000)
  // End date filters are inclusive in the UI; database bounds are exclusive.
  if (endValue) end.setUTCDate(end.getUTCDate() + 1)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) return null
  return { gte: start, lt: end }
}
