import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { LeadAssignmentDepartment } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

function canManageElectricians(actorDepartmentsRaw: unknown[], actorRoles: string[]) {
  const actorDepartments = new Set(
    (actorDepartmentsRaw ?? []).map((d) =>
      typeof d === 'string' ? d.trim().toUpperCase().replace(/\s+/g, '_') : '',
    ),
  )
  const isAdmin =
    actorDepartments.has('ADMIN') ||
    actorRoles.some((r) => r.toUpperCase() === 'ADMIN')
  const isPc =
    actorDepartments.has('PROJECT_COORDINATOR') ||
    actorDepartments.has('PROJECT_CORDINATOR') ||
    actorRoles.some((r) => r.toUpperCase().includes('PROJECT_COORDINATOR'))
  const isElectricEngineer =
    actorDepartments.has('ELECTRIC_ENGINEER') ||
    actorDepartments.has('ELECTRICAL_ENGINEER') ||
    actorRoles.some((r) => r.toUpperCase().includes('ELECTRIC_ENGINEER'))

  return isAdmin || isPc || isElectricEngineer
}

/**
 * GET /api/lead/[id]/electricians
 * Returns all assigned Electricians for a lead.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const { id: leadId } = await params
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Lead ID is required' }, { status: 400 })
    }

    const assignments = await prisma.leadAssignment.findMany({
      where: {
        leadId,
        department: LeadAssignmentDepartment.ELECTRICIAN,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: assignments.map((a) => a.user),
    })
  } catch (error) {
    console.error('[GET /api/lead/[id]/electricians]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/lead/[id]/electricians
 * Synchronizes assigned Electricians for a lead.
 * Body: { userIds: string[] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    if (!canManageElectricians(authResult.actor.userDepartments ?? [], authResult.actorRoles ?? [])) {
      return NextResponse.json(
        { success: false, error: 'Only Electric Engineer, Project Coordinator, or Admin can assign Electricians' },
        { status: 403 },
      )
    }

    const { id: leadId } = await params
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Lead ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const userIds: string[] = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : []

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, name: true },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.leadAssignment.deleteMany({
        where: {
          leadId,
          department: LeadAssignmentDepartment.ELECTRICIAN,
          ...(userIds.length > 0 ? { userId: { notIn: userIds } } : {}),
        },
      })

      for (const uid of userIds) {
        await tx.leadAssignment.upsert({
          where: {
            leadId_department_userId: {
              leadId,
              department: LeadAssignmentDepartment.ELECTRICIAN,
              userId: uid,
            },
          },
          create: {
            leadId,
            department: LeadAssignmentDepartment.ELECTRICIAN,
            userId: uid,
          },
          update: {},
        })
      }
    })

    const updatedAssignments = await prisma.leadAssignment.findMany({
      where: {
        leadId,
        department: LeadAssignmentDepartment.ELECTRICIAN,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedAssignments.map((a) => a.user),
      message: 'Electricians updated successfully.',
    })
  } catch (error) {
    console.error('[PUT /api/lead/[id]/electricians]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/lead/[id]/electricians
 * Adds an Electrician to the project.
 * Body: { userId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    if (!canManageElectricians(authResult.actor.userDepartments ?? [], authResult.actorRoles ?? [])) {
      return NextResponse.json(
        { success: false, error: 'Only Electric Engineer, Project Coordinator, or Admin can assign Electricians' },
        { status: 403 },
      )
    }

    const { id: leadId } = await params
    const body = await request.json()
    const { userId } = body

    if (!leadId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Lead ID and User ID are required' },
        { status: 400 },
      )
    }

    const assignment = await prisma.leadAssignment.upsert({
      where: {
        leadId_department_userId: {
          leadId,
          department: LeadAssignmentDepartment.ELECTRICIAN,
          userId,
        },
      },
      create: {
        leadId,
        department: LeadAssignmentDepartment.ELECTRICIAN,
        userId,
      },
      update: {},
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: assignment.user,
      message: 'Electrician assigned successfully.',
    })
  } catch (error) {
    console.error('[POST /api/lead/[id]/electricians]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/lead/[id]/electricians?userId=...
 * Removes an assigned Electrician from the project.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    if (!canManageElectricians(authResult.actor.userDepartments ?? [], authResult.actorRoles ?? [])) {
      return NextResponse.json(
        { success: false, error: 'Only Electric Engineer, Project Coordinator, or Admin can remove Electricians' },
        { status: 403 },
      )
    }

    const { id: leadId } = await params
    const url = new URL(request.url)
    let userId = url.searchParams.get('userId') || ''
    if (!userId) {
      const body = await request.json().catch(() => ({}))
      userId = typeof body?.userId === 'string' ? body.userId : ''
    }

    if (!leadId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Lead ID and User ID are required' },
        { status: 400 },
      )
    }

    await prisma.leadAssignment.deleteMany({
      where: {
        leadId,
        department: LeadAssignmentDepartment.ELECTRICIAN,
        userId,
      },
    })

    const remaining = await prisma.leadAssignment.findMany({
      where: {
        leadId,
        department: LeadAssignmentDepartment.ELECTRICIAN,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: remaining.map((a) => a.user),
      message: 'Electrician removed from project.',
    })
  } catch (error) {
    console.error('[DELETE /api/lead/[id]/electricians]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
