import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { VendorWorkStatus } from "@/generated/prisma/client"

// GET /api/vendors/agreements?leadId=xxx  — all agreements for a project
// GET /api/vendors/agreements?vendorId=xxx — all agreements for a vendor
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get("leadId")
    const vendorId = searchParams.get("vendorId")

    if (!leadId && !vendorId) {
      return NextResponse.json({ success: false, error: "leadId or vendorId is required" }, { status: 400 })
    }

    const agreements = await prisma.vendorAgreement.findMany({
      where: {
        ...(leadId ? { leadId } : {}),
        ...(vendorId ? { vendorId } : {}),
      },
      include: {
        vendor: {
          select: {
            id: true,
            vendorId: true,
            vendorName: true,
            vendorCompanyName: true,
            vendorType: true,
            primaryPhone: true,
            primaryEmail: true,
          },
        },
        lead: {
          select: { id: true, name: true },
        },
        milestones: {
          orderBy: { createdAt: "asc" },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          include: {
            milestone: { select: { id: true, title: true } },
          },
        },
        revisions: {
          orderBy: { changedAt: "desc" },
        },
        _count: { select: { payments: true, milestones: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // Compute totals
    const data = agreements.map((ag) => {
      const totalPaid = ag.payments.reduce((sum, p) => sum + p.amount, 0)
      const balance = ag.agreementValue - totalPaid
      const paidPercent = ag.agreementValue > 0 ? (totalPaid / ag.agreementValue) * 100 : 0
      const retentionHeld = ag.retentionReleased ? 0 : (ag.agreementValue * ag.retentionPercent) / 100
      return { ...ag, totalPaid, balance, paidPercent, retentionHeld }
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/vendors/agreements — create new vendor-project agreement
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const {
      vendorId,
      leadId,
      agreementValue,
      workScope,
      retentionPercent,
      notes,
    } = body

    if (!vendorId) return NextResponse.json({ success: false, error: "vendorId is required" }, { status: 400 })
    if (!leadId) return NextResponse.json({ success: false, error: "leadId is required" }, { status: 400 })
    if (!agreementValue || agreementValue <= 0) {
      return NextResponse.json({ success: false, error: "agreementValue must be greater than 0" }, { status: 400 })
    }

    const agreement = await prisma.vendorAgreement.create({
      data: {
        vendorId,
        leadId,
        agreementValue: parseFloat(agreementValue),
        workScope: workScope?.trim() || null,
        retentionPercent: parseFloat(retentionPercent ?? 0),
        notes: notes?.trim() || null,
        workStatus: VendorWorkStatus.NOT_STARTED,
      },
      include: {
        vendor: { select: { vendorName: true, vendorType: true } },
        lead: { select: { name: true } },
      },
    })

    return NextResponse.json({ success: true, data: agreement }, { status: 201 })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "An agreement already exists for this vendor on this project" },
        { status: 400 }
      )
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
