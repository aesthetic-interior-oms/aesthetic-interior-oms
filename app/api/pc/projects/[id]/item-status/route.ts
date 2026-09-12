import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { normalizeDepartmentName } from '@/lib/department-normalization'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const { id: leadId } = await params
    const body = await req.json().catch(() => ({}))
    const { draftId, lineId, completed } = body as { draftId?: string; lineId?: string; completed?: boolean }

    if (!draftId || !lineId || typeof completed !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 })
    }

    // Check department access
    const userDepts = await prisma.userDepartment.findMany({
      where: { userId: user.id },
      select: { department: { select: { name: true } } },
    })
    const deptNames = new Set(
      userDepts
        .map((d) => normalizeDepartmentName(d.department.name))
        .filter((name): name is string => Boolean(name)),
    )

    const isAdmin = deptNames.has('ADMIN')
    const isPc = deptNames.has('PROJECT_COORDINATOR')

    if (!isAdmin && !isPc) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    if (isPc && !isAdmin) {
      const assignment = await prisma.leadAssignment.findFirst({
        where: {
          leadId,
          userId: user.id,
          department: 'PROJECT_COORDINATOR',
        },
      })
      if (!assignment) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
    }

    const draft = await prisma.quotationDraft.findFirst({
      where: { id: draftId, leadId },
    })

    if (!draft) {
      return NextResponse.json({ success: false, error: 'Quotation draft not found' }, { status: 404 })
    }

    const content = (draft.content as Record<string, unknown>) ?? {}
    const lineItems = Array.isArray(content.lineItems) ? (content.lineItems as Array<Record<string, unknown>>) : []

    let updated = false
    const nextItems = lineItems.map((item) => {
      if (item.id === lineId) {
        updated = true
        return { ...item, completed }
      }
      return item
    })

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Item not found in quotation' }, { status: 404 })
    }

    const nextContent = { ...content, lineItems: nextItems }

    const savedDraft = await prisma.quotationDraft.update({
      where: { id: draft.id },
      data: {
        content: nextContent as any,
        updatedById: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        draftId: savedDraft.id,
        lineId,
        completed,
      },
    })
  } catch (error) {
    console.error('[api/pc/projects/[id]/item-status] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update item status' }, { status: 500 })
  }
}
