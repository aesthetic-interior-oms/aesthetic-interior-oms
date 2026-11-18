import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { MainLayout } from '@/components/layout/mainlayout'
import { normalizeDepartmentName } from '@/lib/department-normalization'
import { hasBoqLeaderRole } from '@/lib/boq-roles'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export default async function ProductionLayout({
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

  const departmentNames = new Set(
    user.userDepartments
      .map((row) => normalizeDepartmentName(row.department.name))
      .filter((name): name is string => Boolean(name)),
  )

  const roleNames = user.userRoles.map((row) => row.role.name)
  const isBoqLeader = hasBoqLeaderRole(roleNames)

  if (departmentNames.has('ADMIN')) {
    return <MainLayout role="Admin">{children}</MainLayout>
  }

  if (
    departmentNames.has('PROJECT_CORDINATOR') ||
    departmentNames.has('PROJECT_COORDINATOR')
  ) {
    return <MainLayout role="Project Coordinator">{children}</MainLayout>
  }

  if (departmentNames.has('BOQ')) {
    return <MainLayout role={isBoqLeader ? 'BOQ Team Leader' : 'BOQ Team Member'}>{children}</MainLayout>
  }

  if (
    departmentNames.has('SITE_ENGINEER') ||
    departmentNames.has('PROJECT_ENGINEER') ||
    departmentNames.has('IMPLEMENTATION_TEAM')
  ) {
    return <MainLayout role="Site Engineer">{children}</MainLayout>
  }

  if (
    departmentNames.has('PROCUREMENT') ||
    departmentNames.has('PROCUREMENT_DEPARTMENT') ||
    departmentNames.has('PROCUREMENT_SUPPLY_CHAIN')
  ) {
    return <MainLayout role="Procurement">{children}</MainLayout>
  }

  if (departmentNames.has('SR_CRM')) {
    return <MainLayout role="SR CRM">{children}</MainLayout>
  }

  redirect('/onboarding')
}
