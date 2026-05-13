import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { hasJrArchitectureLeaderRole } from '@/lib/jr-architecture-roles'
import { JrArchitectureCalendarOverview } from '@/components/jr-architecture/calendar-overview'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export default async function JrArchitectureCalendarPage() {
  const { userId } = await auth()
  if (!userId) redirect('/')

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      userRoles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
      userDepartments: {
        select: {
          department: {
            select: { name: true },
          },
        },
      },
    },
  })

  if (!user || user.userDepartments.length === 0) redirect('/onboarding')

  const isJrArchitect = user.userDepartments.some(
    (row) => row.department.name === 'VISUALIZER_3D' || row.department.name === '3D_VISUALIZER',
  )
  if (!isJrArchitect) redirect('/')

  const roleNames = user.userRoles.map((entry) => entry.role?.name ?? '').filter(Boolean)
  if (!hasJrArchitectureLeaderRole(roleNames)) {
    redirect('/crm/visualizer/dashboard')
  }

  return <JrArchitectureCalendarOverview />
}
