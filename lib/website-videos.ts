import prisma from '@/lib/prisma'

export type WebsiteVideoProvider = 'youtube' | 'facebook' | 'instagram' | 'other'

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
