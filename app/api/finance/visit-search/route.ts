import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Search visits by lead name for the visit picker in finance form
// Returns visits with visitFee > 0 and the associated lead + assigned team member
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim() ?? ""

    if (q.length < 2) {
      return NextResponse.json({ success: true, data: [] })
    }

    const visits = await prisma.visit.findMany({
      where: {
        visitFee: { gt: 0 },
        lead: {
          name: { contains: q, mode: "insensitive" },
        },
      },
      select: {
        id: true,
        scheduledAt: true,
        visitFee: true,
        status: true,
        lead: {
          select: { id: true, name: true, phone: true },
        },
        assignedTo: {
          select: { id: true, fullName: true },
        },
        visitPayments: {
          select: { id: true, amount: true },
        },
      },
      orderBy: { scheduledAt: "desc" },
      take: 20,
    })

    const data = visits.map((v) => {
      const totalPaid = v.visitPayments.reduce((s, p) => s + p.amount, 0)
      return {
        id: v.id,
        scheduledAt: v.scheduledAt,
        visitFee: v.visitFee,
        status: v.status,
        feePaidAmount: totalPaid,
        feeIsPaid: totalPaid >= v.visitFee,
        feeIsPartiallyPaid: totalPaid > 0 && totalPaid < v.visitFee,
        lead: v.lead,
        assignedTo: v.assignedTo,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[GET /api/finance/visit-search] failed", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
