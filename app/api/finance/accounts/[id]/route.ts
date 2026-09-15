import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { name, isActive } = body

    const updated = await prisma.financeAccount.update({
      where: { id },
      data: { 
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive }),
      }
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const count = await prisma.transaction.count({ where: { financeAccountId: id } })
    if (count > 0) {
      // Instead of failing and breaking historical ledgers, soft-delete (disable) the account
      const disabled = await prisma.financeAccount.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        disabled: true,
        data: disabled,
        message: `Account disabled because it has ${count} existing transaction(s). Transaction history is preserved.`,
      })
    }

    await prisma.financeAccount.delete({ where: { id } })
    return NextResponse.json({ success: true, message: "Account deleted." })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
