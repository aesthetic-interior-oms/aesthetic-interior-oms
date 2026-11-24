import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireDatabaseRoles } from '@/lib/authz'
import { LeadAssignmentDepartment } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/lead/[id]/site-engineers
 * Returns all assigned Site Engineers for a lead.
 */
export async function GET(
  request: NextRequest,
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
        department: LeadAssignmentDepartment.SITE_ENGINEER,
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
    console.error('[GET /api/lead/[id]/site-engineers]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * PUT /api/lead/[id]/site-engineers
 * Synchronizes assigned site engineers for a lead.
 * Body: { userIds: string[] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = authResult.actorRoles ?? []
    const isAdmin =
      actorDepartments.has('ADMIN') ||
      actorRoles.some((r) => r.toUpperCase() === 'ADMIN')
    const isPc =
      actorDepartments.has('PROJECT_COORDINATOR') ||
      actorDepartments.has('PROJECT_CORDINATOR') ||
      actorRoles.some((r) => r.toUpperCase().includes('PROJECT_COORDINATOR'))

    if (!isAdmin && !isPc) {
      return NextResponse.json(
        { success: false, error: 'Only Project Coordinator or Admin can assign Site Engineers' },
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

    // Sync in transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing assignments not in the new userIds list
      await tx.leadAssignment.deleteMany({
        where: {
          leadId,
          department: LeadAssignmentDepartment.SITE_ENGINEER,
          ...(userIds.length > 0 ? { userId: { notIn: userIds } } : {}),
        },
      })

      // Upsert new assignments
      for (const uid of userIds) {
        await tx.leadAssignment.upsert({
          where: {
            leadId_department_userId: {
              leadId,
              department: LeadAssignmentDepartment.SITE_ENGINEER,
              userId: uid,
            },
          },
          create: {
            leadId,
            department: LeadAssignmentDepartment.SITE_ENGINEER,
            userId: uid,
          },
          update: {},
        })
      }
    })

    // Fetch updated
    const updatedAssignments = await prisma.leadAssignment.findMany({
      where: {
        leadId,
        department: LeadAssignmentDepartment.SITE_ENGINEER,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedAssignments.map((a) => a.user),
      message: 'Site Engineers updated successfully.',
    })
  } catch (error) {
    console.error('[PUT /api/lead/[id]/site-engineers]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/lead/[id]/site-engineers
 * Adds an additional Site Engineer to the project.
 * Body: { userId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = authResult.actorRoles ?? []
    const isAdmin =
      actorDepartments.has('ADMIN') ||
      actorRoles.some((r) => r.toUpperCase() === 'ADMIN')
    const isPc =
      actorDepartments.has('PROJECT_COORDINATOR') ||
      actorDepartments.has('PROJECT_CORDINATOR') ||
      actorRoles.some((r) => r.toUpperCase().includes('PROJECT_COORDINATOR'))

    if (!isAdmin && !isPc) {
      return NextResponse.json(
        { success: false, error: 'Only Project Coordinator or Admin can assign Site Engineers' },
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
          department: LeadAssignmentDepartment.SITE_ENGINEER,
          userId,
        },
      },
      create: {
        leadId,
        department: LeadAssignmentDepartment.SITE_ENGINEER,
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
      message: 'Site Engineer assigned successfully.',
    })
  } catch (error) {
    console.error('[POST /api/lead/[id]/site-engineers]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/lead/[id]/site-engineers
 * Removes a specific Site Engineer from the project.
 * Query or Body: { userId: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireDatabaseRoles([])
    if (!authResult.ok) return authResult.response

    const actorDepartments = new Set(authResult.actor.userDepartments ?? [])
    const actorRoles = authResult.actorRoles ?? []
    const isAdmin =
      actorDepartments.has('ADMIN') ||
      actorRoles.some((r) => r.toUpperCase() === 'ADMIN')
    const isPc =
      actorDepartments.has('PROJECT_COORDINATOR') ||
      actorDepartments.has('PROJECT_CORDINATOR') ||
      actorRoles.some((r) => r.toUpperCase().includes('PROJECT_COORDINATOR'))

    if (!isAdmin && !isPc) {
      return NextResponse.json(
        { success: false, error: 'Only Project Coordinator or Admin can unassign Site Engineers' },
        { status: 403 },
      )
    }

    const { id: leadId } = await params
    const { searchParams } = new URL(request.url)
    let userId = searchParams.get('userId')

    if (!userId) {
      try {
        const body = await request.json()
        userId = body.userId
      } catch {}
    }

    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Lead ID is required' }, { status: 400 })
    }

    if (userId) {
      await prisma.leadAssignment.deleteMany({
        where: {
          leadId,
          department: LeadAssignmentDepartment.SITE_ENGINEER,
          userId,
        },
      })
    } else {
      // Remove all site engineers
      await prisma.leadAssignment.deleteMany({
        where: {
          leadId,
          department: LeadAssignmentDepartment.SITE_ENGINEER,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Site Engineer unassigned successfully.',
    })
  } catch (error) {
    console.error('[DELETE /api/lead/[id]/site-engineers]', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
