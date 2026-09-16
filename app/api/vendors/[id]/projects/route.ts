import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

// GET /api/vendors/[id]/projects — all projects (agreements) for one vendor
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const agreements = await prisma.vendorAgreement.findMany({
      where: { vendorId: id },
      include: {
        lead: { select: { id: true, name: true, stage: true, location: true } },
        payments: { select: { amount: true } },
        milestones: { select: { id: true, title: true, amount: true, isPaid: true, dueDate: true } },
        revisions: { orderBy: { changedAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    })

    const data = agreements.map((ag) => {
      const totalPaid = ag.payments.reduce((s, p) => s + p.amount, 0)
      return {
        ...ag,
        totalPaid,
        balance: ag.agreementValue - totalPaid,
        paidPercent: ag.agreementValue > 0 ? (totalPaid / ag.agreementValue) * 100 : 0,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
