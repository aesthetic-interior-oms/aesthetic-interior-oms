import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import {
  EXECUTION_DEPARTMENTS_REGISTRY,
  isProductionLevelMember,
  isProductionHeadUser,
} from '@/lib/production-module'
import { getDepartmentNameAliases } from '@/lib/department-normalization'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = authResult.actorRoles ?? []

    const authorized =
      actorDepartments.has('ADMIN') ||
      actorDepartments.has('SR_CRM') ||
      isProductionLevelMember({ departments: actorDepartments, roles: actorRoles })

    if (!authorized) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Fetch user counts for each department in parallel
    const departmentStats = await Promise.all(
      EXECUTION_DEPARTMENTS_REGISTRY.map(async (dept) => {
        const aliases = getDepartmentNameAliases(dept.key)
        const userCount = await prisma.user.count({
          where: {
            isActive: true,
            userDepartments: {
              some: {
                department: {
                  name: { in: aliases },
                },
              },
            },
          },
        })
        return {
          ...dept,
          activeStaffCount: userCount,
        }
      }),
    )

    // Count top level heads
    const pcAliases = getDepartmentNameAliases('PROJECT_COORDINATOR')
    const pcCount = await prisma.user.count({
      where: {
        isActive: true,
        userDepartments: {
          some: {
            department: {
              name: { in: pcAliases },
            },
          },
        },
      },
    })

    const boqLeaderCount = await prisma.user.count({
      where: {
        isActive: true,
        userRoles: {
          some: {
            role: {
              name: 'BOQ_TEAM_LEADER',
            },
          },
        },
      },
    })

    const isHead = isProductionHeadUser({ departments: actorDepartments, roles: actorRoles })

    return NextResponse.json({
      success: true,
      data: {
        heads: [
          {
            key: 'PROJECT_COORDINATOR',
            title: 'Project Coordinator',
            scope: 'Site & Project Execution, Timelines, Field Delivery',
            activeCount: pcCount,
            reportingDepartments: departmentStats.filter((d) => d.reportingHead === 'PROJECT_COORDINATOR'),
          },
          {
            key: 'BOQ_TEAM_LEADER',
            title: 'BOQ Team Leader',
            scope: 'Estimation, Bill of Quantities, Requisition Planning & Costing',
            activeCount: boqLeaderCount,
            reportingDepartments: departmentStats.filter((d) => d.reportingHead === 'BOQ_TEAM_LEADER'),
          },
        ],
        allExecutionDepartments: departmentStats,
        userCanManage: isHead,
      },
    })
  } catch (error) {
    console.error('[API /api/production/departments] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch production departments' },
      { status: 500 },
    )
  }
}
