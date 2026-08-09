import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { getWebsiteTestimonials } from '@/lib/website-testimonials'

type TestimonialPayload = { quote?: string; author?: string; project?: string; image?: string; isPublished?: boolean; sortOrder?: number }

export function normalizeTestimonialPayload(payload: TestimonialPayload) {
  const quote = payload.quote?.trim()
  const author = payload.author?.trim()
  const project = payload.project?.trim()
  const image = payload.image?.trim()
  if (!quote) throw new Error('Testimonial quote is required')
  if (!author) throw new Error('Client name is required')
  if (!project) throw new Error('Project label is required')
  if (!image) throw new Error('Image URL is required')
  return { quote, author, project, image, isPublished: payload.isPublished !== false, sortOrder: Number.isFinite(payload.sortOrder) ? Number(payload.sortOrder) : 0 }
}

export async function GET(request: NextRequest) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response
  return NextResponse.json({ testimonials: await getWebsiteTestimonials({ includeDrafts: request.nextUrl.searchParams.get('includeDrafts') === 'true', seedDefaults: true }) })
}

export async function POST(request: NextRequest) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response
  try {
    const input = normalizeTestimonialPayload((await request.json()) as TestimonialPayload)
    await prisma.$executeRaw`INSERT INTO "WebsiteTestimonial" ("id", "quote", "author", "project", "image", "isPublished", "sortOrder", "updatedAt") VALUES (${randomUUID()}, ${input.quote}, ${input.author}, ${input.project}, ${input.image}, ${input.isPublished}, ${input.sortOrder}, NOW())`
    revalidatePath('/')
    revalidatePath('/services')
    return NextResponse.json({ testimonials: await getWebsiteTestimonials({ includeDrafts: true }) }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create testimonial' }, { status: 400 })
  }
}
