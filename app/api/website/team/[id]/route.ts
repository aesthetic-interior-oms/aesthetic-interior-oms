import { NextRequest, NextResponse } from 'next/server'
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

type Params = { params: Promise<{ id: string }> }

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

export async function PUT(request: NextRequest, { params }: Params) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response

  const { id } = await params
  try {
    const input = normalizePayload((await request.json()) as TeamPayload)
    await prisma.$executeRaw`
      UPDATE "WebsiteTeamMember"
      SET "name" = ${input.name}, "role" = ${input.role}, "image" = ${input.image}, "specialty" = ${input.specialty},
        "quote" = ${input.quote}, "isPublished" = ${input.isPublished}, "sortOrder" = ${input.sortOrder}, "updatedAt" = NOW()
      WHERE "id" = ${id}
    `

    const members = await getWebsiteTeamMembers({ includeDrafts: true })
    return NextResponse.json({ members })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update team member'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response

  const { id } = await params
  await prisma.$executeRaw`DELETE FROM "WebsiteTeamMember" WHERE "id" = ${id}`
  const members = await getWebsiteTeamMembers({ includeDrafts: true })
  return NextResponse.json({ members })
}
