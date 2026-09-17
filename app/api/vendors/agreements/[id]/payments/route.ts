import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { VENDOR_TYPE_TO_EXPENSE_CATEGORY } from "@/lib/vendor-utils"
import { VendorPaymentMethod } from "@/generated/prisma/client"

// Helper to resolve database User.id from Clerk clerkUserId
async function getDbUserId(clerkUserId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  })
  if (user?.id) return user.id

  // Try finding user by ID directly
  const userById = await prisma.user.findUnique({
    where: { id: clerkUserId },
    select: { id: true },
  })
  if (userById?.id) return userById.id

  // Fallback to first available database user
  const firstUser = await prisma.user.findFirst({ select: { id: true } })
  if (firstUser?.id) return firstUser.id

  return clerkUserId
}

// GET /api/vendors/agreements/[id]/payments
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const payments = await prisma.vendorPayment.findMany({
      where: { agreementId: id },
      orderBy: { paymentDate: "desc" },
      include: {
        milestone: { select: { id: true, title: true } },
        transaction: { select: { id: true, voucherNo: true, serialNo: true } },
      },
    })

    return NextResponse.json({ success: true, data: payments })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/vendors/agreements/[id]/payments — record payment + auto-create Transaction
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const dbUserId = await getDbUserId(clerkUserId)

    const { id } = await params
    const body = await request.json()
    const {
      amount,
      paymentDate,
      paymentMethod,
      milestoneId,
      note,
      financeAccountId,
    } = body

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ success: false, error: "amount must be > 0" }, { status: 400 })
    }

    // Load agreement with vendor and lead info
    const agreement = await prisma.vendorAgreement.findUnique({
      where: { id },
      include: {
        vendor: { select: { vendorName: true, vendorType: true } },
        lead: { select: { id: true, name: true } },
      },
    })
    if (!agreement) return NextResponse.json({ success: false, error: "Agreement not found" }, { status: 404 })

    // Determine expense category from vendor type
    const expenseCategory = VENDOR_TYPE_TO_EXPENSE_CATEGORY[agreement.vendor.vendorType]

    // Build transaction particular
    const particular = `Vendor Payment – ${agreement.vendor.vendorName} (${agreement.vendor.vendorType.replace(/_/g, " ")})`

    // Safely validate financeAccountId exists in FinanceAccount table
    let validFinanceAccountId: string | null = null
    if (financeAccountId && typeof financeAccountId === "string") {
      const accExists = await prisma.financeAccount.findUnique({
        where: { id: financeAccountId },
        select: { id: true },
      })
      if (accExists) {
        validFinanceAccountId = accExists.id
      }
    }

    // Use prisma.$transaction to create both records atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the finance Transaction (OUTFLOW)
      const transaction = await tx.transaction.create({
        data: {
          type: "OUTFLOW",
          particular,
          amount: parseFloat(amount),
          date: paymentDate ? new Date(paymentDate) : new Date(),
          category: expenseCategory,
          recordedById: dbUserId,
          leadId: agreement.lead.id,
          ...(validFinanceAccountId ? { financeAccountId: validFinanceAccountId } : {}),
        },
      })

      // 2. Create the VendorPayment linked to that Transaction
      const vendorPayment = await tx.vendorPayment.create({
        data: {
          agreementId: id,
          amount: parseFloat(amount),
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod: (paymentMethod as VendorPaymentMethod) || VendorPaymentMethod.CASH,
          milestoneId: milestoneId || null,
          note: note?.trim() || null,
          transactionId: transaction.id,
        },
        include: {
          milestone: { select: { id: true, title: true } },
          transaction: { select: { id: true, voucherNo: true, serialNo: true } },
        },
      })

      // 3. If linked to a milestone, check if fully paid and mark it
      if (milestoneId) {
        const milestone = await tx.vendorPaymentMilestone.findUnique({ where: { id: milestoneId } })
        if (milestone) {
          const paymentsForMilestone = await tx.vendorPayment.aggregate({
            where: { milestoneId },
            _sum: { amount: true },
          })
          const totalMilestonePaid = (paymentsForMilestone._sum.amount ?? 0) + parseFloat(amount)
          if (totalMilestonePaid >= milestone.amount) {
            await tx.vendorPaymentMilestone.update({
              where: { id: milestoneId },
              data: { isPaid: true, paidAt: new Date() },
            })
          }
        }
      }

      return vendorPayment
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error: any) {
    console.error("[POST /api/vendors/agreements/[id]/payments] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
