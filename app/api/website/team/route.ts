import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { getWebsiteTeamMembers } from '@/lib/website-team'

type TeamPayload = {
  name?: string
  role?: string
  image?: string
  specialty?: string
  quote?: string
  isPublished?: boolean
  sortOrder?: number
}

function normalizePayload(payload: TeamPayload) {
  const name = payload.name?.trim()
  const role = payload.role?.trim()
  const image = payload.image?.trim()
  const specialty = payload.specialty?.trim()
  const quote = payload.quote?.trim()

  if (!name) throw new Error('Team member name is required')
  if (!role) throw new Error('Team member role is required')
  if (!image) throw new Error('Team member image is required')
  if (!specialty) throw new Error('Team member department/specialty is required')
  if (!quote) throw new Error('Team member quote is required')

  return {
    name,
    role,
    image,
    specialty,
    quote,
    isPublished: payload.isPublished !== false,
    sortOrder: Number.isFinite(payload.sortOrder) ? Number(payload.sortOrder) : 0,
  }
}

export async function GET(request: NextRequest) {
  const includeDrafts = request.nextUrl.searchParams.get('includeDrafts') === 'true'
  if (includeDrafts) {
    const authResult = await requireDatabaseRoles(['ADMIN'])
    if (!authResult.ok) return authResult.response
  }

  const members = await getWebsiteTeamMembers({ includeDrafts })
  return NextResponse.json({ members })
}

export async function POST(request: NextRequest) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response

  try {
    const input = normalizePayload((await request.json()) as TeamPayload)
    await prisma.$executeRaw`
      INSERT INTO "WebsiteTeamMember" ("id", "name", "role", "image", "specialty", "quote", "isPublished", "sortOrder", "updatedAt")
      VALUES (${randomUUID()}, ${input.name}, ${input.role}, ${input.image}, ${input.specialty}, ${input.quote}, ${input.isPublished}, ${input.sortOrder}, NOW())
    `

    const members = await getWebsiteTeamMembers({ includeDrafts: true })
    return NextResponse.json({ members }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create team member'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
