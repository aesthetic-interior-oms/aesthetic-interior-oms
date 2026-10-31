import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { MainLayout } from '@/components/layout/mainlayout'
import { normalizeDepartmentName } from '@/lib/department-normalization'

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

  const isProcurement =
    departmentNames.has('ADMIN') ||
    departmentNames.has('PROCUREMENT') ||
    departmentNames.has('PROCUREMENT_DEPARTMENT') ||
    departmentNames.has('PROCUREMENT_SUPPLY_CHAIN')

  // Allow admins and procurement team members to view
  if (!isProcurement) {
    redirect('/onboarding')
  }

  return <MainLayout role="Procurement">{children}</MainLayout>
}
