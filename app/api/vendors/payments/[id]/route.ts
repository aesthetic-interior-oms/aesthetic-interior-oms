import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

// DELETE /api/vendors/payments/[id] — delete payment and its linked Transaction
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const payment = await prisma.vendorPayment.findUnique({ where: { id } })
    if (!payment) return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      // Delete vendor payment first
      await tx.vendorPayment.delete({ where: { id } })

      // Then delete the linked Transaction if it exists
      if (payment.transactionId) {
        await tx.transaction.delete({ where: { id: payment.transactionId } })
      }

      // Re-check milestone status if it was linked
      if (payment.milestoneId) {
        const remainingPayments = await tx.vendorPayment.aggregate({
          where: { milestoneId: payment.milestoneId },
          _sum: { amount: true },
        })
        const milestone = await tx.vendorPaymentMilestone.findUnique({ where: { id: payment.milestoneId } })
        if (milestone) {
          const totalPaid = remainingPayments._sum.amount ?? 0
          if (totalPaid < milestone.amount && milestone.isPaid) {
            await tx.vendorPaymentMilestone.update({
              where: { id: payment.milestoneId },
              data: { isPaid: false, paidAt: null },
            })
          }
        }
      }
    })

    return NextResponse.json({ success: true, message: "Payment and linked transaction deleted" })
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ success: false, error: "Payment not found" }, { status: 404 })
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
