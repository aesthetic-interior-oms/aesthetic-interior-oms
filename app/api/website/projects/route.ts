import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { getWebsiteProjects } from '@/lib/website-projects'

const allowedCategories = new Set(['residential', 'commercial', 'renovation', 'furniture'])

type ProjectPayload = {
  title?: string
  slug?: string
  ownerName?: string
  type?: string
  sqft?: string
  duration?: string
  category?: string
  location?: string
  thumbnailUrl?: string
  description?: string
  details?: string
  isPublished?: boolean
  sortOrder?: number
  images?: string[]
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizePayload(payload: ProjectPayload) {
  const title = payload.title?.trim()
  const thumbnailUrl = payload.thumbnailUrl?.trim()
  const description = payload.description?.trim()
  const category = payload.category?.trim().toLowerCase() || 'residential'

  if (!title) throw new Error('Project name is required')
  if (!thumbnailUrl) throw new Error('Project thumbnail is required')
  if (!description) throw new Error('Project description is required')
  if (!allowedCategories.has(category)) throw new Error('Invalid project category')

  return {
    title,
    slug: slugify(payload.slug || title),
    ownerName: payload.ownerName?.trim() || null,
    type: payload.type?.trim() || null,
    sqft: payload.sqft?.trim() || null,
    duration: payload.duration?.trim() || null,
    category,
    location: payload.location?.trim() || null,
    thumbnailUrl,
    description,
    details: payload.details?.trim() || null,
    isPublished: payload.isPublished !== false,
    sortOrder: Number.isFinite(payload.sortOrder) ? Number(payload.sortOrder) : 0,
    images: (payload.images || []).map((url) => url.trim()).filter(Boolean),
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response

  const includeDrafts = request.nextUrl.searchParams.get('includeDrafts') === 'true'
  const projects = await getWebsiteProjects({ includeDrafts })
  return NextResponse.json({ projects })
}

export async function POST(request: NextRequest) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response

  try {
    const input = normalizePayload((await request.json()) as ProjectPayload)
    const id = randomUUID()

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "WebsiteProject" (
          "id", "slug", "title", "ownerName", "type", "sqft", "duration", "category", "location",
          "thumbnailUrl", "description", "details", "isPublished", "sortOrder", "updatedAt"
        ) VALUES (
          ${id}, ${input.slug}, ${input.title}, ${input.ownerName}, ${input.type}, ${input.sqft}, ${input.duration},
          ${input.category}, ${input.location}, ${input.thumbnailUrl}, ${input.description}, ${input.details},
          ${input.isPublished}, ${input.sortOrder}, NOW()
        )
      `

      const imageUrls = input.images.length ? input.images : [input.thumbnailUrl]
      for (const [index, url] of imageUrls.entries()) {
        await tx.$executeRaw`
          INSERT INTO "WebsiteProjectImage" ("id", "projectId", "url", "alt", "sortOrder")
          VALUES (${randomUUID()}, ${id}, ${url}, ${input.title}, ${index})
        `
      }
    })

    const projects = await getWebsiteProjects({ includeDrafts: true })
    return NextResponse.json({ projects }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create project'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
