import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { VendorWorkStatus } from "@/generated/prisma/client"

// PATCH /api/vendors/agreements/[id] — update work scope, status, retention, notes
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { workScope, workStatus, retentionPercent, retentionReleased, notes, agreementValue } = body

    const updated = await prisma.vendorAgreement.update({
      where: { id },
      data: {
        ...(workScope !== undefined && { workScope: workScope?.trim() || null }),
        ...(workStatus !== undefined && { workStatus: workStatus as VendorWorkStatus }),
        ...(retentionPercent !== undefined && { retentionPercent: parseFloat(retentionPercent) }),
        ...(retentionReleased !== undefined && { retentionReleased }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(agreementValue !== undefined && { agreementValue: parseFloat(agreementValue) }),
      },
      include: {
        vendor: { select: { vendorName: true, vendorType: true } },
        lead: { select: { name: true } },
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
