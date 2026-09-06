import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { normalizeDepartmentName } from '@/lib/department-normalization'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      )
    }

    const { id: leadId } = await params

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
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      )
    }

    // PC users can only view their own assigned projects
    if (isPc && !isAdmin) {
      const assignment = await prisma.leadAssignment.findFirst({
        where: {
          leadId,
          userId: user.id,
          department: 'PROJECT_COORDINATOR',
        },
      })
      if (!assignment) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 },
        )
      }
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        name: true,
        location: true,
        phone: true,
        agreementType: true,
        agreementValue: true,
        stage: true,
        subStatus: true,
        budget: true,
        created_at: true,
        assignments: {
          where: { department: 'SR_CRM' },
          select: { user: { select: { fullName: true } } },
          take: 1,
        },
        quotationDrafts: {
          select: {
            id: true,
            draftKey: true,
            quotationType: true,
            grandTotal: true,
            status: true,
            updatedAt: true,
            content: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    })

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: lead })
  } catch (error) {
    console.error('[PC Project Detail API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project' },
      { status: 500 },
    )
  }
}
