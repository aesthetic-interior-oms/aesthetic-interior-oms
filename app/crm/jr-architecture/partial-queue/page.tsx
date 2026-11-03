import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { VisitQueueCalendar } from '@/components/crm/shared/visit-queue-calendar'
import { hasJrArchitectureLeaderRole } from '@/lib/jr-architecture-roles'
import prisma from '@/lib/prisma'

export default async function JrArchitecturePartialQueuePage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const actor = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      userDepartments: {
        select: {
          department: {
            select: { name: true },
          },
        },
      },
      userRoles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
    },
  })

  const departmentNames = new Set(
    (actor?.userDepartments ?? []).map((row) => row.department.name),
  )
  const roleNames = (actor?.userRoles ?? []).map((row) => row.role.name)
  const canAccessPartialQueue =
    departmentNames.has('ADMIN') ||
    (departmentNames.has('JR_ARCHITECT') &&
      hasJrArchitectureLeaderRole(roleNames))

  if (!canAccessPartialQueue) {
    redirect('/crm/jr-architecture/dashboard')
  }

  return (
    <VisitQueueCalendar
      title="Partial Visit Queue"
      subtitle="Calendar view of scheduled partial visits and completed partial visits awaiting JR Architect assignment."
      leadHrefPrefix="/visit-team/partial-visits"
      visitScope="all"
      mode="partial"
    />
  )
}
