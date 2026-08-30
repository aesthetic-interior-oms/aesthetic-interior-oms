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

    await prisma.transaction.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error(`[DELETE /api/finance/transactions/[id]] failed`, error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
