import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { getWebsiteVideos } from '@/lib/website-videos'
import { normalizeVideoPayload } from '../route'

type VideoPayload = { title?: string; url?: string; thumbnailUrl?: string; duration?: string; isFeatured?: boolean; isPublished?: boolean; sortOrder?: number }

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response
  const { id } = await params
  try {
    const payload = (await request.json()) as VideoPayload
    const input = normalizeVideoPayload(payload)
    await prisma.$transaction(async (tx) => {
      if (input.isFeatured) await tx.$executeRaw`UPDATE "WebsiteVideo" SET "isFeatured" = false WHERE "id" <> ${id}`
      await tx.$executeRaw`UPDATE "WebsiteVideo" SET "title" = ${input.title}, "url" = ${input.url}, "provider" = ${input.provider}, "videoId" = ${input.videoId}, "embedUrl" = ${input.embedUrl}, "thumbnailUrl" = ${input.thumbnailUrl}, "duration" = ${input.duration}, "isFeatured" = ${input.isFeatured}, "isPublished" = ${input.isPublished}, "sortOrder" = ${input.sortOrder}, "updatedAt" = NOW() WHERE "id" = ${id}`
    })
    revalidatePath('/')
    return NextResponse.json({ videos: await getWebsiteVideos({ includeDrafts: true }) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update website video' }, { status: 400 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response
  const { id } = await params
  await prisma.$executeRaw`DELETE FROM "WebsiteVideo" WHERE "id" = ${id}`
  revalidatePath('/')
  return NextResponse.json({ videos: await getWebsiteVideos({ includeDrafts: true }) })
}
