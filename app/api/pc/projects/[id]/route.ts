import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizeDepartmentName } from '@/lib/department-normalization'
import { requireDatabaseRoles } from '@/lib/authz'

export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireDatabaseRoles([], req)
    if (!authResult.ok) return authResult.response

    const user = { id: authResult.actorUserId }

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
    const isSiteEngineer =
      deptNames.has('SITE_ENGINEER') ||
      deptNames.has('PROJECT_ENGINEER') ||
      deptNames.has('IMPLEMENTATION_TEAM')

    if (!isAdmin && !isPc && !isSiteEngineer) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      )
    }

    // Role-specific assignment checks for non-admins
    if (!isAdmin && !isPc) {
      if (isSiteEngineer) {
        const seAssignment = await prisma.leadAssignment.findFirst({
          where: {
            leadId,
            userId: user.id,
            department: 'SITE_ENGINEER',
          },
        })
        // If there are specific assignments, ensure access; or allow general site engineer view
        const anySeAssignment = await prisma.leadAssignment.findFirst({
          where: { leadId, department: 'SITE_ENGINEER' },
        })
        if (anySeAssignment && !seAssignment) {
          return NextResponse.json(
            { success: false, error: 'Forbidden' },
            { status: 403 },
          )
        }
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
        agreementSqft: true,
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
            projectSqft: true,
            grandTotal: true,
            status: true,
            updatedAt: true,
            content: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
        materialRequisitions: {
          select: {
            id: true,
            requisitionNo: true,
            status: true,
            notes: true,
            createdAt: true,
            createdBy: { select: { fullName: true } },
            items: {
              select: {
                id: true,
                quotationLineItemId: true,
                materialName: true,
                workCategory: true,
                finalQuantity: true,
                unit: true,
                specifications: true,
                variantAttributes: true,
                remarks: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        purchaseOrders: {
          select: {
            id: true,
            poNo: true,
            status: true,
            totalAmount: true,
            supplierName: true,
            notes: true,
            accountsNote: true,
            createdAt: true,
            approvedAt: true,
            createdBy: { select: { fullName: true } },
            approvedBy: { select: { fullName: true } },
            indent: {
              select: {
                indentNo: true,
                items: {
                  select: {
                    id: true,
                    quantity: true,
                    unitPrice: true,
                    total: true,
                    requisitionItem: {
                      select: {
                        id: true,
                        materialName: true,
                        unit: true,
                        specifications: true,
                        workCategory: true,
                        quotationLineItemId: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        siteDeliveryLogs: {
          select: {
            id: true,
            challanNo: true,
            vendorName: true,
            itemsSummary: true,
            quantity: true,
            unit: true,
            deliveryDate: true,
            condition: true,
            slipUrl: true,
            notes: true,
            receivedBy: { select: { fullName: true } },
          },
          orderBy: { deliveryDate: 'desc' },
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
