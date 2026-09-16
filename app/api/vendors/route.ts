import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { VendorStatus, VendorType } from "@/generated/prisma/client"

// Auto-generate a human-readable vendorId like VND-0001
async function generateVendorId(): Promise<string> {
  const count = await prisma.vendor.count()
  const next = count + 1
  return `VND-${String(next).padStart(4, "0")}`
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const vendors = await prisma.vendor.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: vendors })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

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

    if (!vendorName || !vendorName.trim()) {
      return NextResponse.json({ success: false, error: "Vendor name is required" }, { status: 400 })
    }
    if (!vendorType) {
      return NextResponse.json({ success: false, error: "Vendor type is required" }, { status: 400 })
    }

    const vendorId = await generateVendorId()

    const vendor = await prisma.vendor.create({
      data: {
        vendorId,
        vendorName: vendorName.trim(),
        vendorCompanyName: vendorCompanyName?.trim() || null,
        status: (status as VendorStatus) || VendorStatus.ACTIVE,
        vendorType: vendorType as VendorType,
        bankName: bankName?.trim() || null,
        routingNumber: routingNumber?.trim() || null,
        accountNumber: accountNumber?.trim() || null,
        primaryEmail: primaryEmail?.trim() || null,
        primaryPhone: primaryPhone?.trim() || null,
        billingAddress: billingAddress?.trim() || null,
      },
    })

    return NextResponse.json({ success: true, data: vendor }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
