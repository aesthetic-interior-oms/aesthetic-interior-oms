import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export const runtime = "nodejs"
export const preferredRegion = "sin1"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        userDepartments: {
          select: {
            department: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { fullName: "asc" },
    })

    return NextResponse.json({ success: true, users })
  } catch (error: any) {
    console.error("GET /api/finance/stock/users error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch users" }, { status: 500 })
  }
}
