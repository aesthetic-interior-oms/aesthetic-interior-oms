import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { getWebsiteTeamMembers } from '@/lib/website-team'

type Params = { params: Promise<{ id: string }> }

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

  if (!name) throw new Error('Team member name is required')
  if (!role) throw new Error('Team member role is required')
  if (!image) throw new Error('Team member image is required')

  return {
    name,
    role,
    image,
    specialty: payload.specialty?.trim() || null,
    quote: payload.quote?.trim() || null,
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
      SET "name" = ${input.name}, "role" = ${input.role}, "image" = ${input.image},
        "specialty" = ${input.specialty}, "quote" = ${input.quote}, "isPublished" = ${input.isPublished},
        "sortOrder" = ${input.sortOrder}, "updatedAt" = NOW()
      WHERE "id" = ${id}
    `

    revalidatePath('/about')
    const teamMembers = await getWebsiteTeamMembers({ includeDrafts: true })
    return NextResponse.json({ teamMembers })
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
  revalidatePath('/about')
  const teamMembers = await getWebsiteTeamMembers({ includeDrafts: true })
  return NextResponse.json({ teamMembers })
}
