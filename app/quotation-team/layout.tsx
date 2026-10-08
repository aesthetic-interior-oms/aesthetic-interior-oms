import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { MainLayout } from '@/components/layout/mainlayout'

import { normalizeDepartmentName } from '@/lib/department-normalization'

const JR_CRM_DASHBOARD = '/crm/jr/dashboard'
const ADMIN_DASHBOARD = '/crm/admin/dashboard'
const SR_CRM_DASHBOARD = '/crm/sr/dashboard'
const VISIT_DASHBOARD = '/visit-team/visit-dashboard'
const JR_ARCHITECT_DASHBOARD = '/crm/jr-architecture/dashboard'
const VISUALIZER_DASHBOARD = '/crm/visualizer/dashboard'

export const runtime = 'nodejs'
export const preferredRegion = 'sin1'

export default async function QuotationTeamLayout({
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

  if (user.userDepartments.length > 0) {
    return <MainLayout role="Quotation Team">{children}</MainLayout>
  }

  redirect('/onboarding')
}
