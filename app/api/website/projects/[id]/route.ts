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

type Params = { params: Promise<{ id: string }> }

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
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

export async function PUT(request: NextRequest, { params }: Params) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response

  const { id } = await params

  try {
    const input = normalizePayload((await request.json()) as ProjectPayload)

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "WebsiteProject"
        SET "slug" = ${input.slug}, "title" = ${input.title}, "ownerName" = ${input.ownerName},
          "type" = ${input.type}, "sqft" = ${input.sqft}, "duration" = ${input.duration},
          "category" = ${input.category}, "location" = ${input.location}, "thumbnailUrl" = ${input.thumbnailUrl},
          "description" = ${input.description}, "details" = ${input.details}, "isPublished" = ${input.isPublished},
          "sortOrder" = ${input.sortOrder}, "updatedAt" = NOW()
        WHERE "id" = ${id}
      `
      await tx.$executeRaw`DELETE FROM "WebsiteProjectImage" WHERE "projectId" = ${id}`
      const imageUrls = input.images.length ? input.images : [input.thumbnailUrl]
      for (const [index, url] of imageUrls.entries()) {
        await tx.$executeRaw`
          INSERT INTO "WebsiteProjectImage" ("id", "projectId", "url", "alt", "sortOrder")
          VALUES (${randomUUID()}, ${id}, ${url}, ${input.title}, ${index})
        `
      }
    })

    const projects = await getWebsiteProjects({ includeDrafts: true })
    return NextResponse.json({ projects })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update project'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response

  const { id } = await params
  await prisma.$executeRaw`DELETE FROM "WebsiteProject" WHERE "id" = ${id}`
  const projects = await getWebsiteProjects({ includeDrafts: true })
  return NextResponse.json({ projects })
}
