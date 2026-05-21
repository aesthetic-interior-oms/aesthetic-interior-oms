import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { LeadStage, Prisma } from "@/generated/prisma/client"
import { formatPhoneForStorage } from "@/lib/phone-normalize"

export const runtime = "nodejs"
export const preferredRegion = "sin1"

type ContactBody = {
  name?: unknown
  email?: unknown
  phone?: unknown
  message?: unknown
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizePhone(value: unknown): string | null {
  const raw = toOptionalString(value)
  if (!raw) return null

  const normalized = formatPhoneForStorage(raw)
  if (!normalized) return raw.replace(/\D/g, "") || raw

  if (/^8801[3-9]\d{8}$/.test(normalized)) {
    return `0${normalized.slice(3)}`
  }

  return normalized
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContactBody

    const name = toOptionalString(body.name)
    const email = toOptionalString(body.email)?.toLowerCase() ?? null
    const phone = normalizePhone(body.phone)
    const message = toOptionalString(body.message)

    if (!name || !phone || !message) {
      return NextResponse.json(
        { success: false, message: "Name, phone, and message are required" },
        { status: 400 },
      )
    }

    const existingLead = await prisma.lead.findFirst({
      where: { phone },
      select: { id: true },
    })

    if (existingLead) {
      return NextResponse.json(
        { success: false, message: "A lead with this phone number already exists" },
        { status: 409 },
      )
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        email,
        source: "Website",
        remarks: message,
        stage: LeadStage.NUMBER_COLLECTED,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        source: true,
        stage: true,
        created_at: true,
      },
    })

    return NextResponse.json(
      { success: true, message: "Lead created successfully", data: lead },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "A lead with this phone number already exists" },
        { status: 409 },
      )
    }

    console.error("[POST /api/contact] failed", error)
    return NextResponse.json(
      { success: false, message: "Failed to submit contact request" },
      { status: 500 },
    )
  }
}
