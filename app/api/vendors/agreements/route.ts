import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { VendorWorkStatus, LeadAssignmentDepartment, RequisitionWorkCategory } from "@/generated/prisma/client"
import { canManageCeilingVendorWorkOrders } from "@/lib/boq-roles"

// GET /api/vendors/agreements?leadId=xxx  — all agreements for a project
// GET /api/vendors/agreements?vendorId=xxx — all agreements for a vendor
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get("leadId")
    const vendorId = searchParams.get("vendorId")
    const quotationLineItemId = searchParams.get("quotationLineItemId")
    const workCategory = searchParams.get("workCategory")

    if (!leadId && !vendorId) {
      return NextResponse.json({ success: false, error: "leadId or vendorId is required" }, { status: 400 })
    }

    const agreements = await prisma.vendorAgreement.findMany({
      where: {
        ...(leadId ? { leadId } : {}),
        ...(vendorId ? { vendorId } : {}),
        ...(quotationLineItemId ? { quotationLineItemId } : {}),
        ...(workCategory ? { workCategory: workCategory as RequisitionWorkCategory } : {}),
      },
      include: {
        vendor: {
          select: {
            id: true,
            vendorId: true,
            vendorName: true,
            vendorCompanyName: true,
            vendorType: true,
            primaryPhone: true,
            primaryEmail: true,
          },
        },
        lead: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, fullName: true },
        },
        milestones: {
          orderBy: { createdAt: "asc" },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          include: {
            milestone: { select: { id: true, title: true } },
          },
        },
        revisions: {
          orderBy: { changedAt: "desc" },
        },
        _count: { select: { payments: true, milestones: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // Compute totals
    const data = agreements.map((ag) => {
      const totalPaid = ag.payments.reduce((sum, p) => sum + p.amount, 0)
      const balance = ag.agreementValue - totalPaid
      const paidPercent = ag.agreementValue > 0 ? (totalPaid / ag.agreementValue) * 100 : 0
      const retentionHeld = ag.retentionReleased ? 0 : (ag.agreementValue * ag.retentionPercent) / 100
      return { ...ag, totalPaid, balance, paidPercent, retentionHeld }
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/vendors/agreements — create new vendor-project agreement / work order
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        userRoles: { select: { role: { select: { name: true } } } },
        userDepartments: { select: { department: { select: { name: true } } } },
      },
    })
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })

    const body = await request.json()
    const {
      vendorId,
      leadId,
      agreementValue,
      workScope,
      retentionPercent,
      notes,
      workOrderNo,
      workCategory,
      quotationLineItemId,
      milestones,
    } = body

    if (!vendorId) return NextResponse.json({ success: false, error: "vendorId is required" }, { status: 400 })
    if (!leadId) return NextResponse.json({ success: false, error: "leadId is required" }, { status: 400 })
    if (!agreementValue || Number(agreementValue) <= 0) {
      return NextResponse.json({ success: false, error: "agreementValue must be greater than 0" }, { status: 400 })
    }

    const roleNames = user.userRoles.map((r) => r.role.name)
    const deptNames = user.userDepartments.map((d) => d.department.name)

    const isAssignedPc = Boolean(
      await prisma.leadAssignment.findFirst({
        where: {
          leadId,
          userId: user.id,
          department: LeadAssignmentDepartment.PROJECT_COORDINATOR,
        },
        select: { id: true },
      })
    )

    // Permission enforcement: Ceiling Work Orders require BOQ Team Leader, PC, Accounts, or Admin
    if (workCategory === 'CEILING') {
      const allowed = canManageCeilingVendorWorkOrders({
        roles: roleNames,
        departments: deptNames,
        isAssignedPc,
      }) || deptNames.includes('ACCOUNTS') || roleNames.some((r) => r.toLowerCase().includes('account'))

      if (!allowed) {
        return NextResponse.json(
          {
            success: false,
            error: "Permission denied. Only BOQ Team Leader and Project Coordinator have permission to create Ceiling vendor work orders.",
          },
          { status: 403 }
        )
      }
    }

    const generatedWoNo =
      workOrderNo?.trim() ||
      (workCategory === 'CEILING'
        ? `WO-CEIL-${Date.now().toString().slice(-6)}`
        : `WO-${Date.now().toString().slice(-6)}`)

    const agreement = await prisma.vendorAgreement.create({
      data: {
        vendorId,
        leadId,
        workOrderNo: generatedWoNo,
        workCategory: workCategory ? (workCategory as RequisitionWorkCategory) : null,
        quotationLineItemId: quotationLineItemId || null,
        createdById: user.id,
        agreementValue: parseFloat(agreementValue),
        workScope: workScope?.trim() || null,
        retentionPercent: parseFloat(retentionPercent ?? 0),
        notes: notes?.trim() || null,
        workStatus: VendorWorkStatus.NOT_STARTED,
        ...(Array.isArray(milestones) && milestones.length > 0
          ? {
              milestones: {
                create: milestones
                  .filter((m: any) => m && m.title && Number(m.amount) > 0)
                  .map((m: any) => ({
                    title: String(m.title).trim(),
                    amount: parseFloat(m.amount),
                    dueDate: m.dueDate ? new Date(m.dueDate) : null,
                    notes: m.notes ? String(m.notes).trim() : null,
                  })),
              },
            }
          : {}),
      },
      include: {
        vendor: { select: { id: true, vendorName: true, vendorCompanyName: true, vendorType: true, primaryPhone: true } },
        lead: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
        milestones: true,
      },
    })

    return NextResponse.json({ success: true, data: agreement }, { status: 201 })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "A work order or agreement with this number already exists" },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

