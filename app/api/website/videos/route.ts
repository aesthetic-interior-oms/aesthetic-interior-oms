import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { requireDatabaseRoles } from '@/lib/authz'
import prisma from '@/lib/prisma'
import { getWebsiteVideos, type WebsiteVideoProvider } from '@/lib/website-videos'

type VideoPayload = { title?: string; url?: string; thumbnailUrl?: string; duration?: string; isFeatured?: boolean; isPublished?: boolean; sortOrder?: number }

function parseVideoUrl(rawUrl: string): { provider: WebsiteVideoProvider; videoId: string | null; embedUrl: string; thumbnailUrl: string | null } {
  const parsed = new URL(rawUrl)
  const host = parsed.hostname.replace(/^www\./, '')
  if (host === 'youtu.be' || host.includes('youtube.com')) {
    const videoId = host === 'youtu.be' ? parsed.pathname.slice(1).split('/')[0] : parsed.searchParams.get('v') || parsed.pathname.match(/\/(shorts|embed)\/([^/?#]+)/)?.[2] || null
    if (!videoId) throw new Error('A valid YouTube video or Shorts URL is required')
    return { provider: 'youtube', videoId, embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`, thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` }
  }
  if (host.includes('facebook.com') || host.includes('fb.watch')) {
    return { provider: 'facebook', videoId: null, embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(rawUrl)}&show_text=false&width=1280`, thumbnailUrl: null }
  }
  if (host.includes('instagram.com')) {
    const cleanUrl = rawUrl.split('?')[0].replace(/\/$/, '')
    return { provider: 'instagram', videoId: parsed.pathname.split('/').filter(Boolean).pop() || null, embedUrl: `${cleanUrl}/embed`, thumbnailUrl: null }
  }
  return { provider: 'other', videoId: null, embedUrl: rawUrl, thumbnailUrl: null }
}

export function normalizeVideoPayload(payload: VideoPayload) {
  const title = payload.title?.trim()
  const url = payload.url?.trim()
  if (!title) throw new Error('Video title is required')
  if (!url) throw new Error('Video URL is required')
  const parsed = parseVideoUrl(url)
  return { title, url, ...parsed, thumbnailUrl: payload.thumbnailUrl?.trim() || parsed.thumbnailUrl, duration: payload.duration?.trim() || null, isFeatured: payload.isFeatured === true, isPublished: payload.isPublished !== false, sortOrder: Number.isFinite(payload.sortOrder) ? Number(payload.sortOrder) : 0 }
}

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
