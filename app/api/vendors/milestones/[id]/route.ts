import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

// PATCH /api/vendors/milestones/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { title, amount, dueDate, notes, isPaid } = body

    const updated = await prisma.vendorPaymentMilestone.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(isPaid !== undefined && {
          isPaid,
          paidAt: isPaid ? new Date() : null,
        }),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ success: false, error: "Milestone not found" }, { status: 404 })
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/vendors/milestones/[id] — only if not paid
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const milestone = await prisma.vendorPaymentMilestone.findUnique({ where: { id } })
    if (!milestone) return NextResponse.json({ success: false, error: "Milestone not found" }, { status: 404 })
    if (milestone.isPaid) {
      return NextResponse.json({ success: false, error: "Cannot delete a paid milestone" }, { status: 400 })
    }

    await prisma.vendorPaymentMilestone.delete({ where: { id } })
    return NextResponse.json({ success: true, message: "Milestone deleted" })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
