import { auth } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import prisma from '@/lib/prisma'
import { normalizeDepartmentName } from '@/lib/department-normalization'
import { hasBoqLeaderRole } from '@/lib/boq-roles'
import { verifyMobileToken } from '@/lib/mobile-auth'

export async function getConveyanceActor(request?: Request) {
  // 1. Check for Mobile App JWT Bearer Token
  let token: string | null = null
  if (request) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.trim().split(' ')[1]
    }
  } else {
    try {
      const headerList = await headers()
      const authHeader = headerList.get('authorization') || headerList.get('Authorization')
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.trim().split(' ')[1]
      }
    } catch {}
  }

  if (token) {
    const payload = verifyMobileToken(token)
    if (payload?.userId) {
      return prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          fullName: true,
          userDepartments: { select: { department: { select: { name: true } } } },
          userRoles: { select: { role: { select: { name: true } } } },
        },
      })
    }
  }

  // 2. Fallback to Clerk Web session cookie
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) return null
    return prisma.user.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        fullName: true,
        userDepartments: { select: { department: { select: { name: true } } } },
        userRoles: { select: { role: { select: { name: true } } } },
      },
    })
  } catch {
    return null
  }
}

export function isConveyanceAccounts(actor: NonNullable<Awaited<ReturnType<typeof getConveyanceActor>>>) {
  const departments = actor.userDepartments
    .map((row) => normalizeDepartmentName(row.department.name))
    .filter((name): name is string => Boolean(name))
  return departments.includes('ACCOUNTS') || departments.includes('ADMIN') || departments.includes('FINANCE')
}

export function isProjectCoordinator(actor: NonNullable<Awaited<ReturnType<typeof getConveyanceActor>>>) {
  const departments = actor.userDepartments
    .map((row) => normalizeDepartmentName(row.department.name))
    .filter((name): name is string => Boolean(name))
  const roles = (actor.userRoles ?? []).map((row) => row.role.name.trim().toUpperCase().replace(/\s+/g, '_'))
  return (
    departments.includes('PROJECT_CORDINATOR') ||
    departments.includes('PROJECT_COORDINATOR') ||
    roles.includes('PROJECT_COORDINATOR') ||
    roles.includes('PROJECT_CORDINATOR')
  )
}

export function isBoqTeamLeader(actor: NonNullable<Awaited<ReturnType<typeof getConveyanceActor>>>) {
  const roles = (actor.userRoles ?? []).map((row) => row.role.name)
  return hasBoqLeaderRole(roles)
}

export function canVerifyConveyance(actor: NonNullable<Awaited<ReturnType<typeof getConveyanceActor>>>) {
  return isConveyanceAccounts(actor) || isProjectCoordinator(actor) || isBoqTeamLeader(actor)
}

export function canRequestConveyance(actor: NonNullable<Awaited<ReturnType<typeof getConveyanceActor>>>) {
  return !actor.userDepartments.some((row) => normalizeDepartmentName(row.department.name) === 'ACCOUNTS')
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
