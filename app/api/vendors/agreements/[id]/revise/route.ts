import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

// POST /api/vendors/agreements/[id]/revise — log agreement value revision
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { newValue, changeReason } = body

    if (!newValue || parseFloat(newValue) <= 0) {
      return NextResponse.json({ success: false, error: "newValue must be greater than 0" }, { status: 400 })
    }
    if (!changeReason?.trim()) {
      return NextResponse.json({ success: false, error: "changeReason is required" }, { status: 400 })
    }

    const agreement = await prisma.vendorAgreement.findUnique({ where: { id } })
    if (!agreement) return NextResponse.json({ success: false, error: "Agreement not found" }, { status: 404 })

    // Create revision log + update agreement value in a transaction
    const [revision, updated] = await prisma.$transaction([
      prisma.vendorAgreementRevision.create({
        data: {
          agreementId: id,
          oldValue: agreement.agreementValue,
          newValue: parseFloat(newValue),
          changeReason: changeReason.trim(),
        },
      }),
      prisma.vendorAgreement.update({
        where: { id },
        data: { agreementValue: parseFloat(newValue) },
      }),
    ])

    return NextResponse.json({ success: true, data: { revision, agreement: updated } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
