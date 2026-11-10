import prisma from '@/lib/prisma'
import { LeadAssignmentDepartment } from '@/generated/prisma/client'

export type DepartmentType = 'SR_CRM' | 'JR_ARCHITECT' | 'QUOTATION' | 'VISIT_TEAM'

export type DepartmentMemberSettingItem = {
  userId: string
  fullName: string
  email: string | null
  departmentName: string
  isEnabled: boolean
  notes?: string | null
  roleNames?: string[]
}

/**
 * Returns all candidate users for a given department.
 */
export async function getDepartmentCandidateUsers(department: DepartmentType): Promise<
  Array<{ id: string; fullName: string; email: string | null; roleNames?: string[] }>
> {
  switch (department) {
    case 'SR_CRM': {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          userDepartments: {
            some: {
              department: {
                name: { in: ['SR_CRM', 'SR CRM', 'Senior CRM'], mode: 'insensitive' },
              },
            },
          },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          userRoles: { select: { role: { select: { name: true } } } },
        },
        orderBy: { fullName: 'asc' },
      })
      return users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        roleNames: u.userRoles.map((r) => r.role?.name).filter((n): n is string => Boolean(n)),
      }))
    }

    case 'JR_ARCHITECT': {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            {
              userDepartments: {
                some: {
                  department: {
                    name: { in: ['JR_ARCHITECT', 'Jr Architect', 'JR Architecture', 'Junior Architect'], mode: 'insensitive' },
                  },
                },
              },
            },
            {
              phaseTasksAssigned: {
                some: { phaseType: 'CAD' },
              },
            },
            {
              cadWorkSubmissions: {
                some: {},
              },
            },
          ],
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          userRoles: { select: { role: { select: { name: true } } } },
        },
        orderBy: { fullName: 'asc' },
      })
      return users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        roleNames: u.userRoles.map((r) => r.role?.name).filter((n): n is string => Boolean(n)),
      }))
    }

    case 'QUOTATION': {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            {
              userDepartments: {
                some: {
                  department: {
                    name: { in: ['QUOTATION_TEAM', 'QUOTATION', 'Quotation Team', 'Quotation'], mode: 'insensitive' },
                  },
                },
              },
            },
            {
              leadAssignments: {
                some: {
                  department: LeadAssignmentDepartment.QUOTATION,
                },
              },
            },
            {
              quotationDraftsCreated: {
                some: {},
              },
            },
            {
              quotationDraftsUpdated: {
                some: {},
              },
            },
          ],
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          userRoles: { select: { role: { select: { name: true } } } },
        },
        orderBy: { fullName: 'asc' },
      })
      return users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        roleNames: u.userRoles.map((r) => r.role?.name).filter((n): n is string => Boolean(n)),
      }))
    }

    case 'VISIT_TEAM': {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          userDepartments: {
            some: {
              department: {
                name: {
                  in: ['VISIT_TEAM', 'SPECIALIST_DESIGN_CONSULTANTS'],
                  mode: 'insensitive',
                },
              },
            },
          },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          userRoles: { select: { role: { select: { name: true } } } },
        },
        orderBy: { fullName: 'asc' },
      })
      return users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        roleNames: u.userRoles.map((r) => r.role?.name).filter((n): n is string => Boolean(n)),
      }))
    }
  }
}

/**
 * Gets the monthly performance member settings for a specific department and monthKey.
 */
export async function getDepartmentMemberMonthlySettings(
  department: DepartmentType,
  monthKey: string,
): Promise<DepartmentMemberSettingItem[]> {
  const candidates = await getDepartmentCandidateUsers(department)

  // Fetch settings from DepartmentMemberMonthlySetting
  const settings = await prisma.departmentMemberMonthlySetting.findMany({
    where: {
      department,
      monthKey,
    },
  })
  const settingMap = new Map(settings.map((s) => [s.userId, s]))

  // For VISIT_TEAM, also check VisitMemberMonthlyAssessment for backward compatibility
  let visitAssessmentMap = new Map<string, { isEnabled: boolean; notes: string | null }>()
  if (department === 'VISIT_TEAM') {
    const assessments = await prisma.visitMemberMonthlyAssessment.findMany({
      where: { monthKey },
    })
    visitAssessmentMap = new Map(assessments.map((a) => [a.userId, { isEnabled: a.isEnabled, notes: a.notes }]))
  }

  return candidates.map((candidate) => {
    const setting = settingMap.get(candidate.id)
    const visitAssessment = visitAssessmentMap.get(candidate.id)

    let isEnabled = true
    let notes: string | null = null

    if (setting !== undefined) {
      isEnabled = setting.isEnabled
      notes = setting.notes
    } else if (visitAssessment !== undefined) {
      isEnabled = visitAssessment.isEnabled
      notes = visitAssessment.notes
    }

    return {
      userId: candidate.id,
      fullName: candidate.fullName,
      email: candidate.email,
      departmentName: department,
      isEnabled,
      notes,
      roleNames: candidate.roleNames,
    }
  })
}

/**
 * Gets a set of enabled user IDs for a department in a given month.
 */
export async function getEnabledDepartmentUserIds(
  department: DepartmentType,
  monthKey: string,
): Promise<Set<string>> {
  const members = await getDepartmentMemberMonthlySettings(department, monthKey)
  const enabledIds = new Set<string>()
  for (const m of members) {
    if (m.isEnabled) {
      enabledIds.add(m.userId)
    }
  }
  return enabledIds
}

/**
 * Updates or creates settings for department members for a month.
 */
export async function updateDepartmentMemberMonthlySettings(
  department: DepartmentType,
  monthKey: string,
  settings: Array<{ userId: string; isEnabled: boolean; notes?: string | null }>,
  actorUserId?: string,
) {
  if (settings.length === 0) return

  await prisma.$transaction(
    settings.map((item) =>
      prisma.departmentMemberMonthlySetting.upsert({
        where: {
          department_userId_monthKey: {
            department,
            userId: item.userId,
            monthKey,
          },
        },
        create: {
          department,
          userId: item.userId,
          monthKey,
          isEnabled: Boolean(item.isEnabled),
          notes: item.notes?.trim() || null,
          updatedById: actorUserId || null,
        },
        update: {
          isEnabled: Boolean(item.isEnabled),
          notes: item.notes?.trim() || null,
          updatedById: actorUserId || null,
        },
      }),
    ),
  )

  // If department is VISIT_TEAM, also synchronize VisitMemberMonthlyAssessment so visit-team routes stay in sync
  if (department === 'VISIT_TEAM') {
    await prisma.$transaction(
      settings.map((item) =>
        prisma.visitMemberMonthlyAssessment.upsert({
          where: {
            userId_monthKey: {
              userId: item.userId,
              monthKey,
            },
          },
          create: {
            userId: item.userId,
            monthKey,
            isEnabled: Boolean(item.isEnabled),
            notes: item.notes?.trim() || null,
            updatedById: actorUserId || null,
          },
          update: {
            isEnabled: Boolean(item.isEnabled),
            notes: item.notes?.trim() || null,
            updatedById: actorUserId || null,
          },
        }),
      ),
    )
  }
}
