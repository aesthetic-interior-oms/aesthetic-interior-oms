import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { MainLayout } from '@/components/layout/mainlayout'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export default async function AccountsLayout({
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
    user.userDepartments.map((row) => row.department.name),
  )

  if (departmentNames.has('ACCOUNTS') || departmentNames.has('ADMIN')) {
    return <MainLayout role="Accounts">{children}</MainLayout>
  }

  redirect('/onboarding')
}
