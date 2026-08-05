import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireDatabaseRoles } from '@/lib/authz'
import { getWebsiteTestimonials, saveWebsiteTestimonials } from '@/lib/website-testimonials'

type Params = { params: Promise<{ id: string }> }
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

export async function PUT(request: NextRequest, { params }: Params) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response
  const { id } = await params
  try {
    const input = normalize((await request.json()) as Payload)
    const existing = await getWebsiteTestimonials({ includeDrafts: true })
    const testimonials = await saveWebsiteTestimonials(existing.map((item) => (item.id === id ? { id, ...input } : item)))
    revalidatePath('/')
    revalidatePath('/services')
    return NextResponse.json({ testimonials })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update testimonial' }, { status: 400 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response
  const { id } = await params
  const existing = await getWebsiteTestimonials({ includeDrafts: true })
  const testimonials = await saveWebsiteTestimonials(existing.filter((item) => item.id !== id))
  revalidatePath('/')
  revalidatePath('/services')
  return NextResponse.json({ testimonials })
}
