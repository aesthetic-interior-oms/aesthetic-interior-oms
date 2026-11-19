import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { hasProcurementLeaderRole, hasProcurementRole } from '@/lib/procurement-roles'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response
  const roles = auth.actorRoles ?? []
  const departments = auth.actor.userDepartments ?? []
  if (!hasProcurementRole(roles, departments)) {
    return NextResponse.json({ error: 'Procurement access required' }, { status: 403 })
  }

  const leader =
    hasProcurementLeaderRole(roles) ||
    departments.some((d) => d.toUpperCase() === 'ADMIN') ||
    roles.some((r) => r.toUpperCase() === 'ADMIN')

  const rows = await prisma.materialRequisition.findMany({
    where: {
      status: { in: ['SUBMITTED', 'IN_PROCUREMENT', 'FULFILLED'] },
      ...(leader ? {} : { procurementAssigneeId: auth.actorUserId }),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      lead: { select: { id: true, name: true, phone: true, location: true } },
      createdBy: { select: { fullName: true } },
      procurementAssignee: { select: { id: true, fullName: true, email: true } },
      items: {
        include: {
          indentItems: {
            include: {
              indent: {
                select: {
                  id: true,
                  indentNo: true,
                  createdAt: true,
                  createdBy: { select: { fullName: true } },
                },
              },
            },
          },
        },
      },
      indents: {
        include: {
          items: true,
          createdBy: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const members = leader
    ? await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            {
              userDepartments: {
                some: {
                  department: {
                    name: {
                      in: [
                        'PROCUREMENT',
                        'Procurement',
                        'Procurement & Supply Chain',
                        'PROCUREMENT_DEPARTMENT',
                        'PROCUREMENT_SUPPLY_CHAIN',
                      ],
                    },
                  },
                },
              },
            },
            {
              userRoles: {
                some: {
                  role: {
                    name: {
                      in: [
                        'PROCUREMENT_TEAM_MEMBER',
                        'Procurement Team Member',
                        'PROCUREMENT_TEAM_LEADER',
                        'Procurement Team Leader',
                        'procurement_team_member',
                        'Procurement Member',
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
        select: { id: true, fullName: true, email: true },
        orderBy: { fullName: 'asc' },
      })
    : []

  return NextResponse.json({ success: true, data: rows, members, leader })
}

export async function PATCH(request: Request) {
  const auth = await requireDatabaseRoles([])
  if (!auth.ok) return auth.response
  const roles = auth.actorRoles ?? []
  const depts = auth.actor.userDepartments ?? []
  const leader =
    hasProcurementLeaderRole(roles) ||
    depts.some((d) => d.toUpperCase() === 'ADMIN') ||
    roles.some((r) => r.toUpperCase() === 'ADMIN')

  if (!leader) {
    return NextResponse.json({ error: 'Only a Procurement Team Leader can assign requisitions' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (
    !body ||
    typeof body.requisitionId !== 'string' ||
    !(typeof body.assigneeId === 'string' || body.assigneeId === null)
  ) {
    return NextResponse.json({ error: 'Invalid assignment data' }, { status: 400 })
  }

  if (body.assigneeId) {
    const member = await prisma.user.findFirst({
      where: {
        id: body.assigneeId,
        isActive: true,
      },
      select: { id: true, fullName: true },
    })
    if (!member) {
      return NextResponse.json({ error: 'Select an active member' }, { status: 400 })
    }
  }

  const result = await prisma.materialRequisition.updateMany({
    where: { id: body.requisitionId, status: { in: ['SUBMITTED', 'IN_PROCUREMENT'] } },
    data: {
      procurementAssigneeId: body.assigneeId,
      procurementAssignedAt: body.assigneeId ? new Date() : null,
      status: 'IN_PROCUREMENT',
    },
  })

  if (!result.count) {
    return NextResponse.json({ error: 'Requisition not found or no longer assignable' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
