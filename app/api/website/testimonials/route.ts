import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { getWebsiteTestimonials, normalizeTestimonialPayload, type TestimonialPayload } from '@/lib/website-testimonials'

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
