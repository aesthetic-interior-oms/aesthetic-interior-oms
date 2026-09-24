import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export const runtime = "nodejs"
export const preferredRegion = "sin1"
export const dynamic = "force-dynamic"

// Helper to get local DB user from Clerk auth
async function getDbUser() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null
  return prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing transaction ID" }, { status: 400 })
    }

    const body = await request.json()
    const { type, category, particular, amount, financeAccountId, leadId, date } = body

    const existingTx = await prisma.transaction.findUnique({ where: { id } })
    if (!existingTx) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
    }

    const targetType = type !== undefined ? type : existingTx.type
    const targetAccId = financeAccountId !== undefined ? financeAccountId : existingTx.financeAccountId
    const targetAmount = amount !== undefined ? amount : existingTx.amount

    if (targetType === "OUTFLOW" && targetAccId) {
      const account = await prisma.financeAccount.findUnique({
        where: { id: targetAccId },
        select: { name: true }
      })
      const agg = await prisma.transaction.groupBy({
        by: ["type"],
        where: { financeAccountId: targetAccId, NOT: { id } },
        _sum: { amount: true }
      })
      let currentBalance = 0
      for (const g of agg) {
        if (g.type === "INFLOW") currentBalance += g._sum.amount ?? 0
        else currentBalance -= g._sum.amount ?? 0
      }
      if (currentBalance - targetAmount < 0) {
        return NextResponse.json({
          success: false,
          error: `Insufficient balance in "${account?.name ?? "Account"}". Available balance is ${currentBalance.toLocaleString()} BDT, which is insufficient for an outflow of ${targetAmount.toLocaleString()} BDT.`
        }, { status: 400 })
      }
    }

    const updateData: Record<string, any> = {}
    if (type !== undefined) updateData.type = type
    if (category !== undefined) updateData.category = category
    if (particular !== undefined) updateData.particular = particular
    if (amount !== undefined) updateData.amount = amount
    if (financeAccountId !== undefined) updateData.financeAccountId = financeAccountId
    if (leadId !== undefined) updateData.leadId = leadId || null
    if (date !== undefined) updateData.date = new Date(date)

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
          },
        },
        collectedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        financeAccount: true,
        recordedBy: {
          select: {
            id: true,
            fullName: true,
          },
        }
      },
    })

    return NextResponse.json({ success: true, data: transaction })
  } catch (error: unknown) {
    console.error(`[PATCH /api/finance/transactions/[id]] failed`, error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing transaction ID" }, { status: 400 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        vendorPayment: {
          select: { id: true, milestoneId: true },
        },
      },
    })
    if (!transaction) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      const vendorPayment = transaction.vendorPayment

      // Vendor payments are included in Accounts Payable totals. Delete the linked
      // payment together with its finance transaction so a removed transaction is
      // never still shown as paid to the vendor.
      if (vendorPayment) {
        await tx.vendorPayment.delete({ where: { id: vendorPayment.id } })

        if (vendorPayment.milestoneId) {
          const remainingPayments = await tx.vendorPayment.aggregate({
            where: { milestoneId: vendorPayment.milestoneId },
            _sum: { amount: true },
          })
          const milestone = await tx.vendorPaymentMilestone.findUnique({
            where: { id: vendorPayment.milestoneId },
          })

          if (
            milestone &&
            (remainingPayments._sum.amount ?? 0) < milestone.amount &&
            milestone.isPaid
          ) {
            await tx.vendorPaymentMilestone.update({
              where: { id: milestone.id },
              data: { isPaid: false, paidAt: null },
            })
          }
        }
      }

      await tx.transaction.delete({ where: { id: transaction.id } })
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error(`[DELETE /api/finance/transactions/[id]] failed`, error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
