import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
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

export async function GET(request: NextRequest) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response

  const includeDrafts = request.nextUrl.searchParams.get('includeDrafts') === 'true'
  const teamMembers = await getWebsiteTeamMembers({ includeDrafts })
  return NextResponse.json({ teamMembers })
}

export async function POST(request: NextRequest) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response

  try {
    const input = normalizePayload((await request.json()) as TeamPayload)
    await prisma.$executeRaw`
      INSERT INTO "WebsiteTeamMember" (
        "id", "name", "role", "image", "specialty", "quote", "isPublished", "sortOrder", "updatedAt"
      ) VALUES (
        ${randomUUID()}, ${input.name}, ${input.role}, ${input.image}, ${input.specialty}, ${input.quote},
        ${input.isPublished}, ${input.sortOrder}, NOW()
      )
    `

    revalidatePath('/about')
    const teamMembers = await getWebsiteTeamMembers({ includeDrafts: true })
    return NextResponse.json({ teamMembers }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create team member'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
