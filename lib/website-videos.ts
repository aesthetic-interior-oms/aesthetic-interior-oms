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

export const defaultWebsiteVideos: WebsiteVideo[] = [
  { id: 'default-featured', title: 'Featured Design Story', url: 'https://www.youtube.com/watch?v=D-Py5LNmAJA', provider: 'youtube', videoId: 'D-Py5LNmAJA', embedUrl: 'https://www.youtube-nocookie.com/embed/D-Py5LNmAJA', thumbnailUrl: 'https://img.youtube.com/vi/D-Py5LNmAJA/maxresdefault.jpg', duration: null, isFeatured: true, isPublished: true, sortOrder: 0 },
  ...[
    ['kxzxIEPv7QY', 'Interior Design Tour', '3:45'], ['bFnOafhlsm8', 'Client Project Walkthrough', '5:20'], ['m23oIOdAkQE', 'Living Room Design Ideas', '4:15'], ['FZn7HVQtl5c', 'Kitchen Renovation Project', '6:30'], ['DODn4TqAHaE', 'Bedroom Makeover', '3:10'], ['EY2WkvPZdtk', 'Office Space Design', '4:55'], ['SKYpjlBHkPM', 'Bathroom Renovation', '3:30'], ['FZn7HVQtl5c', 'Dining Room Transformation', '4:00'], ['kxzxIEPv7QY', 'Balcony Garden Design', '2:45'], ['EY2WkvPZdtk', 'Walk-in Closet Ideas', '5:00'], ['kXDUVDV6zus', 'Walk-in Closet Ideas', '5:00'],
  ].map(([videoId, title, duration], index) => ({ id: `default-${index + 1}`, title, url: `https://www.youtube.com/watch?v=${videoId}`, provider: 'youtube' as const, videoId, embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`, thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, duration, isFeatured: false, isPublished: true, sortOrder: index + 1 })),
]

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
    return rows.length || includeDrafts ? rows.map(normalizeVideo) : defaultWebsiteVideos
  } catch {
    return includeDrafts ? [] : defaultWebsiteVideos
  }
}
