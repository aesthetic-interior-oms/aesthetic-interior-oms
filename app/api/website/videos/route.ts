import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { getWebsiteVideos, normalizeVideoPayload, type VideoPayload } from '@/lib/website-videos'

export async function GET(request: NextRequest) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response
  return NextResponse.json({ videos: await getWebsiteVideos({ includeDrafts: request.nextUrl.searchParams.get('includeDrafts') === 'true' }) })
}

export async function POST(request: NextRequest) {
  const authResult = await requireDatabaseRoles(['ADMIN'])
  if (!authResult.ok) return authResult.response
  try {
    const input = normalizeVideoPayload((await request.json()) as VideoPayload)
    await prisma.$transaction(async (tx) => {
      if (input.isFeatured) await tx.$executeRaw`UPDATE "WebsiteVideo" SET "isFeatured" = false`
      await tx.$executeRaw`INSERT INTO "WebsiteVideo" ("id", "title", "url", "provider", "videoId", "embedUrl", "thumbnailUrl", "duration", "isFeatured", "isPublished", "sortOrder", "updatedAt") VALUES (${randomUUID()}, ${input.title}, ${input.url}, ${input.provider}, ${input.videoId}, ${input.embedUrl}, ${input.thumbnailUrl}, ${input.duration}, ${input.isFeatured}, ${input.isPublished}, ${input.sortOrder}, NOW())`
    })
    revalidatePath('/')
    return NextResponse.json({ videos: await getWebsiteVideos({ includeDrafts: true }) }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create website video' }, { status: 400 })
  }
}
