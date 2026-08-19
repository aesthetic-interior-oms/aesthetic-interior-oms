import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { VisitCompleteQueueBoard } from '@/components/crm/shared/visit-complete-queue-board'
import { hasJrArchitectureLeaderRole } from '@/lib/jr-architecture-roles'
import prisma from '@/lib/prisma'

export default async function JrArchitectureQueuePage() {
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
  const canAccessVisitQueue =
    departmentNames.has('ADMIN') ||
    departmentNames.has('SR_CRM') ||
    (departmentNames.has('JR_ARCHITECT') &&
      hasJrArchitectureLeaderRole(roleNames))

  if (!canAccessVisitQueue) {
    redirect('/crm/jr-architecture/dashboard')
  }

  return (
    <VisitCompleteQueueBoard
      title="Visit Complete Queue"
      subtitle="Admin, Senior CRM, and JR Architect leaders can assign JR Architects, approve requests, or self-assign."
      leadHrefPrefix={null}
    />
  )
}
