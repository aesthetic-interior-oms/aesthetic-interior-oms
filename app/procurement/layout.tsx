import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { MainLayout } from '@/components/layout/mainlayout'
import { normalizeDepartmentName } from '@/lib/department-normalization'
import { hasProcurementLeaderRole, hasProcurementRole } from '@/lib/procurement-roles'

export const runtime = 'nodejs'

export default async function ProcurementLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) {
    redirect('/')
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
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

  if (!user || user.userDepartments.length === 0) {
    redirect('/onboarding')
  }

  const departmentNames = user.userDepartments
    .map((row) => normalizeDepartmentName(row.department.name))
    .filter((name): name is string => Boolean(name))

  const roleNames = user.userRoles.map((row) => row.role.name)

  const isProcurement = hasProcurementRole(roleNames, departmentNames)

  // Allow admins and procurement team members to view
  if (!isProcurement) {
    redirect('/onboarding')
  }

  const isLeader =
    hasProcurementLeaderRole(roleNames) ||
    departmentNames.some((d) => d === 'ADMIN') ||
    roleNames.some((r) => r.trim().toUpperCase() === 'ADMIN')

  const procurementRole = isLeader ? 'Procurement Team Leader' : 'Procurement Team Member'

  return <MainLayout role={procurementRole}>{children}</MainLayout>
}
