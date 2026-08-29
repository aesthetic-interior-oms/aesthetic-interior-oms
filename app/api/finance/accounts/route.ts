import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const accounts = await prisma.financeAccount.findMany({
      include: {
        transactions: {
          select: { type: true, amount: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    const accountsWithBalance = accounts.map(acc => {
      let balance = 0
      acc.transactions.forEach(tx => {
        if (tx.type === 'INFLOW') balance += tx.amount
        else balance -= tx.amount
      })
      const { transactions, ...rest } = acc
      return { ...rest, balance }
    })

    return NextResponse.json({ success: true, data: accountsWithBalance })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { name, isActive } = body

    if (!name) return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 })

    const newAccount = await prisma.financeAccount.create({
      data: { name, isActive: isActive !== false }
    })
    return NextResponse.json({ success: true, data: newAccount })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: "An account with this name already exists" }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
