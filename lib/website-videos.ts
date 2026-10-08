import prisma from '@/lib/prisma'

export type WebsiteVideoProvider = 'youtube' | 'facebook' | 'instagram' | 'other'

export type VideoPayload = {
  title?: string
  url?: string
  thumbnailUrl?: string
  duration?: string
  isFeatured?: boolean
  isPublished?: boolean
  sortOrder?: number
}

function parseVideoUrl(rawUrl: string): {
  provider: WebsiteVideoProvider
  videoId: string | null
  embedUrl: string
  thumbnailUrl: string | null
} {
  const parsed = new URL(rawUrl)
  const host = parsed.hostname.replace(/^www\./, '')
  if (host === 'youtu.be' || host.includes('youtube.com')) {
    const videoId =
      host === 'youtu.be'
        ? parsed.pathname.slice(1).split('/')[0]
        : parsed.searchParams.get('v') ||
          parsed.pathname.match(/\/(shorts|embed)\/([^/?#]+)/)?.[2] ||
          null
    if (!videoId) throw new Error('A valid YouTube video or Shorts URL is required')
    return {
      provider: 'youtube',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    }
  }
  if (host.includes('facebook.com') || host.includes('fb.watch')) {
    return {
      provider: 'facebook',
      videoId: null,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(rawUrl)}&show_text=false&width=1280`,
      thumbnailUrl: null,
    }
  }
  if (host.includes('instagram.com')) {
    const cleanUrl = rawUrl.split('?')[0].replace(/\/$/, '')
    return {
      provider: 'instagram',
      videoId: parsed.pathname.split('/').filter(Boolean).pop() || null,
      embedUrl: `${cleanUrl}/embed`,
      thumbnailUrl: null,
    }
  }
  return { provider: 'other', videoId: null, embedUrl: rawUrl, thumbnailUrl: null }
}

export function normalizeVideoPayload(payload: VideoPayload) {
  const title = payload.title?.trim()
  const url = payload.url?.trim()
  if (!title) throw new Error('Video title is required')
  if (!url) throw new Error('Video URL is required')
  const parsed = parseVideoUrl(url)
  return {
    title,
    url,
    ...parsed,
    thumbnailUrl: payload.thumbnailUrl?.trim() || parsed.thumbnailUrl,
    duration: payload.duration?.trim() || null,
    isFeatured: payload.isFeatured === true,
    isPublished: payload.isPublished !== false,
    sortOrder: Number.isFinite(payload.sortOrder) ? Number(payload.sortOrder) : 0,
  }
}


export type WebsiteVideo = {
  id: string
  title: string
  url: string
  provider: WebsiteVideoProvider
  videoId: string | null
  embedUrl: string
  thumbnailUrl: string | null
  duration: string | null
  isFeatured: boolean
  isPublished: boolean
  sortOrder: number
}

type WebsiteVideoRow = WebsiteVideo & { provider: string }

function normalizeVideo(row: WebsiteVideoRow): WebsiteVideo {
  return { ...row, provider: row.provider as WebsiteVideoProvider }
}

export async function getWebsiteVideos({ includeDrafts = false } = {}) {
  try {
    const rows = await prisma.$queryRaw<WebsiteVideoRow[]>`
      SELECT "id", "title", "url", "provider", "videoId", "embedUrl", "thumbnailUrl", "duration", "isFeatured", "isPublished", "sortOrder"
      FROM "WebsiteVideo"
      WHERE (${includeDrafts}::BOOLEAN = true OR "isPublished" = true)
      ORDER BY "isFeatured" DESC, "sortOrder" ASC, "createdAt" DESC
    `
    return rows.map(normalizeVideo)
  } catch {
    return []
  }
}
