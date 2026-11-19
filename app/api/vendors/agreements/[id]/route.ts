import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { VendorWorkStatus, LeadAssignmentDepartment } from "@/generated/prisma/client"
import { canManageCeilingVendorWorkOrders } from "@/lib/boq-roles"

// PATCH /api/vendors/agreements/[id] — update work scope, status, retention, notes
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const existing = await prisma.vendorAgreement.findUnique({
      where: { id },
      select: {
        id: true,
        leadId: true,
        workCategory: true,
      },
    })
    if (!existing) return NextResponse.json({ success: false, error: "Agreement not found" }, { status: 404 })

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        userRoles: { select: { role: { select: { name: true } } } },
        userDepartments: { select: { department: { select: { name: true } } } },
      },
    })
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })

    const roleNames = user.userRoles.map((r) => r.role.name)
    const deptNames = user.userDepartments.map((d) => d.department.name)

    if (existing.workCategory === 'CEILING') {
      const isAssignedPc = Boolean(
        await prisma.leadAssignment.findFirst({
          where: {
            leadId: existing.leadId,
            userId: user.id,
            department: LeadAssignmentDepartment.PROJECT_COORDINATOR,
          },
          select: { id: true },
        })
      )
      const allowed = canManageCeilingVendorWorkOrders({
        roles: roleNames,
        departments: deptNames,
        isAssignedPc,
      }) || deptNames.includes('ACCOUNTS') || roleNames.some((r) => r.toLowerCase().includes('account'))

      if (!allowed) {
        return NextResponse.json({
          success: false,
          error: "Permission denied. Only BOQ Team Leader and Project Coordinator can manage Ceiling vendor work orders."
        }, { status: 403 })
      }
    }

    const body = await request.json()
    const { workScope, workStatus, retentionPercent, retentionReleased, notes, agreementValue, quotationLineItemId } = body

    const updated = await prisma.vendorAgreement.update({
      where: { id },
      data: {
        ...(workScope !== undefined && { workScope: workScope?.trim() || null }),
        ...(workStatus !== undefined && { workStatus: workStatus as VendorWorkStatus }),
        ...(retentionPercent !== undefined && { retentionPercent: parseFloat(retentionPercent) }),
        ...(retentionReleased !== undefined && { retentionReleased }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(agreementValue !== undefined && { agreementValue: parseFloat(agreementValue) }),
        ...(quotationLineItemId !== undefined && { quotationLineItemId: quotationLineItemId || null }),
      },
      include: {
        vendor: { select: { id: true, vendorName: true, vendorType: true, primaryPhone: true } },
        lead: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ success: false, error: "Agreement not found" }, { status: 404 })
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/vendors/agreements/[id] — delete agreement (only if no payments)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const existing = await prisma.vendorAgreement.findUnique({
      where: { id },
      select: {
        id: true,
        leadId: true,
        workCategory: true,
      },
    })
    if (!existing) return NextResponse.json({ success: false, error: "Agreement not found" }, { status: 404 })

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        userRoles: { select: { role: { select: { name: true } } } },
        userDepartments: { select: { department: { select: { name: true } } } },
      },
    })
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })

    const roleNames = user.userRoles.map((r) => r.role.name)
    const deptNames = user.userDepartments.map((d) => d.department.name)

    if (existing.workCategory === 'CEILING') {
      const isAssignedPc = Boolean(
        await prisma.leadAssignment.findFirst({
          where: {
            leadId: existing.leadId,
            userId: user.id,
            department: LeadAssignmentDepartment.PROJECT_COORDINATOR,
          },
          select: { id: true },
        })
      )
      const allowed = canManageCeilingVendorWorkOrders({
        roles: roleNames,
        departments: deptNames,
        isAssignedPc,
      }) || deptNames.includes('ACCOUNTS') || roleNames.some((r) => r.toLowerCase().includes('account'))

      if (!allowed) {
        return NextResponse.json({
          success: false,
          error: "Permission denied. Only BOQ Team Leader and Project Coordinator can delete Ceiling vendor work orders."
        }, { status: 403 })
      }
    }

    // Check if payments exist
    const paymentCount = await prisma.vendorPayment.count({ where: { agreementId: id } })
    if (paymentCount > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete agreement with existing payments. Delete all payments first." },
        { status: 400 }
      )
    }

    await prisma.vendorAgreement.delete({ where: { id } })
    return NextResponse.json({ success: true, message: "Agreement deleted" })
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ success: false, error: "Agreement not found" }, { status: 404 })
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

