import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizeDepartmentName } from '@/lib/department-normalization'
import { LeadAssignmentDepartment } from '@/generated/prisma/client'
import { requireDatabaseRoles } from '@/lib/authz'

export const runtime = 'nodejs'

/**
 * PATCH /api/site-engineer/projects/[id]/item-status
 * Updates the completion checkbox for a quotation product line item.
 * Restricted to Site Engineers, Project Coordinators, and Admins.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireDatabaseRoles([], req)
    if (!authResult.ok) return authResult.response

    const user = {
      id: authResult.actorUserId,
      fullName: authResult.actor.fullName,
    }

    const { id: leadId } = await params
    const body = await req.json().catch(() => ({}))
    const { draftId, lineId, completed } = body as {
      draftId?: string
      lineId?: string
      completed?: boolean
    }

    if (!draftId || !lineId || typeof completed !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters (draftId, lineId, completed)' },
        { status: 400 },
      )
    }

    // Check user department permissions
    const userDepts = await prisma.userDepartment.findMany({
      where: { userId: user.id },
      select: { department: { select: { name: true } } },
    })
    const deptNames = new Set(
      userDepts
        .map((d) => normalizeDepartmentName(d.department.name))
        .filter((name): name is string => Boolean(name)),
    )

    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      select: { role: { select: { name: true } } },
    })
    const roleNames = new Set(userRoles.map((r) => r.role.name.toUpperCase()))

    const isAdmin = deptNames.has('ADMIN') || roleNames.has('ADMIN')
    const isPc =
      deptNames.has('PROJECT_COORDINATOR') ||
      deptNames.has('PROJECT_CORDINATOR') ||
      roleNames.has('PROJECT_COORDINATOR')
    const isSiteEngineer =
      deptNames.has('SITE_ENGINEER') ||
      deptNames.has('PROJECT_ENGINEER') ||
      deptNames.has('IMPLEMENTATION_TEAM') ||
      roleNames.has('SITE_ENGINEER')

    if (!isAdmin && !isPc && !isSiteEngineer) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    // Site Engineers cannot directly mark items as completed; they must submit a request for PC approval.
    if (!isAdmin && !isPc && isSiteEngineer) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Site Engineers cannot mark items as completed directly. Please select items and submit a completion request to the Project Coordinator.',
        },
        { status: 403 },
      )
    }

    // Role-specific assignment check for non-admin/non-PC
    if (!isAdmin && !isPc && isSiteEngineer) {
      const seAssignment = await prisma.leadAssignment.findFirst({
        where: {
          leadId,
          userId: user.id,
          department: LeadAssignmentDepartment.SITE_ENGINEER,
        },
      })
      const anySeAssignment = await prisma.leadAssignment.findFirst({
        where: {
          leadId,
          department: LeadAssignmentDepartment.SITE_ENGINEER,
        },
      })
      // If someone else is specifically assigned and current user is not assigned
      if (anySeAssignment && !seAssignment) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You are not assigned to this project site' },
          { status: 403 },
        )
      }
    }

    const draft = await prisma.quotationDraft.findFirst({
      where: { id: draftId, leadId },
    })

    if (!draft) {
      return NextResponse.json(
        { success: false, error: 'Quotation draft not found for this project' },
        { status: 404 },
      )
    }

    const content = (draft.content as Record<string, unknown>) ?? {}
    const lineItems = Array.isArray(content.lineItems)
      ? (content.lineItems as Array<Record<string, unknown>>)
      : []

    let updated = false
    const nextItems = lineItems.map((item) => {
      if (item.id === lineId) {
        updated = true
        return {
          ...item,
          completed,
          completedAt: completed ? new Date().toISOString() : null,
          completedByUserId: completed ? user.id : null,
        }
      }
      return item
    })

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Product item not found in quotation' },
        { status: 404 },
      )
    }

    const nextContent = { ...content, lineItems: nextItems }

    const savedDraft = await prisma.quotationDraft.update({
      where: { id: draft.id },
      data: {
        content: nextContent as any,
        updatedById: user.id,
      },
    })

    // Calculate updated progress
    const activeItems = nextItems.filter((i) => i && (i as any).included !== false)
    const totalItems = activeItems.length
    const completedItems = activeItems.filter((i) => (i as any).completed === true).length
    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    return NextResponse.json({
      success: true,
      data: {
        draftId: savedDraft.id,
        lineId,
        completed,
        scopeProgress: {
          total: totalItems,
          completed: completedItems,
          percent: progressPercent,
        },
      },
    })
  } catch (error) {
    console.error('[Site Engineer item-status API] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update item status' },
      { status: 500 },
    )
  }
}
