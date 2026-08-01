import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { requireDatabaseRoles } from '@/lib/authz'
import { getWebsiteTestimonials, saveWebsiteTestimonials } from '@/lib/website-testimonials'

type Payload = { quote?: string; author?: string; project?: string; image?: string; isPublished?: boolean; sortOrder?: number }

function normalize(payload: Payload) {
  const quote = payload.quote?.trim()
  const author = payload.author?.trim()
  const project = payload.project?.trim()
  const image = payload.image?.trim()
  if (!quote) throw new Error('Testimonial quote is required')
  if (!author) throw new Error('Client name is required')
  if (!project) throw new Error('Project label is required')
  if (!image) throw new Error('Testimonial image is required')
  return { quote, author, project, image, isPublished: payload.isPublished !== false, sortOrder: Number.isFinite(payload.sortOrder) ? Number(payload.sortOrder) : 0 }
}

export async function GET(request: NextRequest) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response
  const includeDrafts = request.nextUrl.searchParams.get('includeDrafts') === 'true'
  const testimonials = await getWebsiteTestimonials({ includeDrafts })
  return NextResponse.json({ testimonials })
}

export async function POST(request: NextRequest) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response
  try {
    const input = normalize((await request.json()) as Payload)
    const existing = await getWebsiteTestimonials({ includeDrafts: true })
    const testimonials = await saveWebsiteTestimonials([...existing, { id: randomUUID(), ...input }])
    revalidatePath('/')
    revalidatePath('/services')
    return NextResponse.json({ testimonials }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create testimonial' }, { status: 400 })
  }
}
