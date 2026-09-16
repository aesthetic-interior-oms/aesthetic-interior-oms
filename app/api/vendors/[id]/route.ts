import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { VendorStatus, VendorType } from "@/generated/prisma/client"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const {
      vendorName,
      vendorCompanyName,
      status,
      vendorType,
      bankName,
      routingNumber,
      accountNumber,
      primaryEmail,
      primaryPhone,
      billingAddress,
    } = body

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        ...(vendorName !== undefined && { vendorName: vendorName.trim() }),
        ...(vendorCompanyName !== undefined && { vendorCompanyName: vendorCompanyName?.trim() || null }),
        ...(status !== undefined && { status: status as VendorStatus }),
        ...(vendorType !== undefined && { vendorType: vendorType as VendorType }),
        ...(bankName !== undefined && { bankName: bankName?.trim() || null }),
        ...(routingNumber !== undefined && { routingNumber: routingNumber?.trim() || null }),
        ...(accountNumber !== undefined && { accountNumber: accountNumber?.trim() || null }),
        ...(primaryEmail !== undefined && { primaryEmail: primaryEmail?.trim() || null }),
        ...(primaryPhone !== undefined && { primaryPhone: primaryPhone?.trim() || null }),
        ...(billingAddress !== undefined && { billingAddress: billingAddress?.trim() || null }),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    await prisma.vendor.delete({ where: { id } })

    return NextResponse.json({ success: true, message: "Vendor deleted successfully" })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
