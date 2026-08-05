import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { getWebsiteTestimonials } from '@/lib/website-testimonials'
import { normalizeTestimonialPayload } from '../route'

type TestimonialPayload = { quote?: string; author?: string; project?: string; image?: string; isPublished?: boolean; sortOrder?: number }

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response
  const { id } = await params
  try {
    const input = normalizeTestimonialPayload((await request.json()) as TestimonialPayload)
    await prisma.$executeRaw`UPDATE "WebsiteTestimonial" SET "quote" = ${input.quote}, "author" = ${input.author}, "project" = ${input.project}, "image" = ${input.image}, "isPublished" = ${input.isPublished}, "sortOrder" = ${input.sortOrder}, "updatedAt" = NOW() WHERE "id" = ${id}`
    revalidatePath('/')
    return NextResponse.json({ testimonials: await getWebsiteTestimonials({ includeDrafts: true }) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update testimonial' }, { status: 400 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response
  const { id } = await params
  await prisma.$executeRaw`DELETE FROM "WebsiteTestimonial" WHERE "id" = ${id}`
  revalidatePath('/')
  return NextResponse.json({ testimonials: await getWebsiteTestimonials({ includeDrafts: true }) })
}
