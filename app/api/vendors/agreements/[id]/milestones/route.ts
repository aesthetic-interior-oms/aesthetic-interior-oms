import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

// GET /api/vendors/agreements/[id]/milestones
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const milestones = await prisma.vendorPaymentMilestone.findMany({
      where: { agreementId: id },
      orderBy: { createdAt: "asc" },
      include: {
        payments: { select: { id: true, amount: true, paymentDate: true } },
      },
    })

    return NextResponse.json({ success: true, data: milestones })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/vendors/agreements/[id]/milestones
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { title, amount, dueDate, notes } = body

    if (!title?.trim()) return NextResponse.json({ success: false, error: "title is required" }, { status: 400 })
    if (!amount || parseFloat(amount) <= 0) return NextResponse.json({ success: false, error: "amount must be > 0" }, { status: 400 })

    // Verify agreement exists
    const agreement = await prisma.vendorAgreement.findUnique({ where: { id } })
    if (!agreement) return NextResponse.json({ success: false, error: "Agreement not found" }, { status: 404 })

    const milestone = await prisma.vendorPaymentMilestone.create({
      data: {
        agreementId: id,
        title: title.trim(),
        amount: parseFloat(amount),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json({ success: true, data: milestone }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
