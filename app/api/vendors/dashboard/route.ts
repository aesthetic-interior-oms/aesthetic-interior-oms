import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

// GET /api/vendors/dashboard — cross-project vendor summary
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const agreements = await prisma.vendorAgreement.findMany({
      include: {
        vendor: {
          select: {
            id: true,
            vendorId: true,
            vendorName: true,
            vendorCompanyName: true,
            vendorType: true,
            status: true,
            primaryPhone: true,
          },
        },
        lead: { select: { id: true, name: true } },
        payments: { select: { amount: true } },
      },
    })

    // Group by vendor
    const vendorMap = new Map<string, {
      vendor: typeof agreements[0]["vendor"]
      projectCount: number
      totalAgreed: number
      totalPaid: number
      balance: number
      activeProjects: string[]
      workStatuses: string[]
    }>()

    for (const ag of agreements) {
      const totalPaid = ag.payments.reduce((s, p) => s + p.amount, 0)
      const balance = ag.agreementValue - totalPaid

      if (!vendorMap.has(ag.vendorId)) {
        vendorMap.set(ag.vendorId, {
          vendor: ag.vendor,
          projectCount: 0,
          totalAgreed: 0,
          totalPaid: 0,
          balance: 0,
          activeProjects: [],
          workStatuses: [],
        })
      }

      const entry = vendorMap.get(ag.vendorId)!
      entry.projectCount++
      entry.totalAgreed += ag.agreementValue
      entry.totalPaid += totalPaid
      entry.balance += balance
      entry.activeProjects.push(ag.lead.name)
      entry.workStatuses.push(ag.workStatus)
    }

    const data = Array.from(vendorMap.values()).map((v) => ({
      ...v,
      paidPercent: v.totalAgreed > 0 ? (v.totalPaid / v.totalAgreed) * 100 : 0,
      hasOutstanding: v.balance > 0,
    }))

    // Sort: outstanding balance first
    data.sort((a, b) => b.balance - a.balance)

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
