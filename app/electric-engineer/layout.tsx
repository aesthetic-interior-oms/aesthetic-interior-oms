import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { MainLayout } from '@/components/layout/mainlayout'
import { normalizeDepartmentName } from '@/lib/department-normalization'

export const runtime = 'nodejs'

export default async function ElectricEngineerLayout({
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

  const isElectricEngineer =
    departmentNames.has('ADMIN') ||
    departmentNames.has('ELECTRIC_ENGINEER') ||
    departmentNames.has('ELECTRICAL_ENGINEER')

  if (!isElectricEngineer) {
    redirect('/onboarding')
  }

  return <MainLayout role="Electric Engineer">{children}</MainLayout>
}
