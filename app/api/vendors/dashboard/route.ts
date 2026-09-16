import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

// GET /api/vendors/dashboard — cross-project vendor summary
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    // Fetch all active vendors and all agreements
    const [vendors, agreements] = await Promise.all([
      prisma.vendor.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.vendorAgreement.findMany({
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
      }),
    ])

    // Build map for all vendors
    const vendorMap = new Map<string, {
      vendor: {
        id: string
        vendorId: string
        vendorName: string
        vendorCompanyName: string | null
        vendorType: string
        status: string
        primaryPhone: string | null
      }
      projectCount: number
      totalAgreed: number
      totalPaid: number
      balance: number
      activeProjects: string[]
      workStatuses: string[]
    }>()

    // Initialize map with all vendors from directory
    for (const v of vendors) {
      vendorMap.set(v.id, {
        vendor: {
          id: v.id,
          vendorId: v.vendorId,
          vendorName: v.vendorName,
          vendorCompanyName: v.vendorCompanyName,
          vendorType: v.vendorType,
          status: v.status,
          primaryPhone: v.primaryPhone,
        },
        projectCount: 0,
        totalAgreed: 0,
        totalPaid: 0,
        balance: 0,
        activeProjects: [],
        workStatuses: [],
      })
    }

    // Populate agreements
    for (const ag of agreements) {
      const totalPaid = ag.payments ? ag.payments.reduce((s, p) => s + (p.amount || 0), 0) : 0
      const balance = (ag.agreementValue || 0) - totalPaid
      const leadName = ag.lead?.name || "Unknown Project"

      if (!vendorMap.has(ag.vendorId)) {
        if (ag.vendor) {
          vendorMap.set(ag.vendorId, {
            vendor: ag.vendor,
            projectCount: 0,
            totalAgreed: 0,
            totalPaid: 0,
            balance: 0,
            activeProjects: [],
            workStatuses: [],
          })
        } else {
          continue
        }
      }

      const entry = vendorMap.get(ag.vendorId)!
      entry.projectCount++
      entry.totalAgreed += ag.agreementValue || 0
      entry.totalPaid += totalPaid
      entry.balance += balance
      if (leadName && !entry.activeProjects.includes(leadName)) {
        entry.activeProjects.push(leadName)
      }
      if (ag.workStatus && !entry.workStatuses.includes(ag.workStatus)) {
        entry.workStatuses.push(ag.workStatus)
      }
    }

    const data = Array.from(vendorMap.values()).map((v) => ({
      ...v,
      paidPercent: v.totalAgreed > 0 ? (v.totalPaid / v.totalAgreed) * 100 : 0,
      hasOutstanding: v.balance > 0,
    }))

    // Sort: highest balance first, then name
    data.sort((a, b) => b.balance - a.balance || a.vendor.vendorName.localeCompare(b.vendor.vendorName))

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[GET /api/vendors/dashboard] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
