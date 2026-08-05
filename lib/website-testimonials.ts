import prisma from '@/lib/prisma'

export type WebsiteTestimonial = {
  id: string
  quote: string
  author: string
  project: string
  image: string
  isPublished: boolean
  sortOrder: number
}

export async function getWebsiteTestimonials({ includeDrafts = false } = {}) {
  try {
    return await prisma.$queryRaw<WebsiteTestimonial[]>`
      SELECT "id", "quote", "author", "project", "image", "isPublished", "sortOrder"
      FROM "WebsiteTestimonial"
      WHERE (${includeDrafts}::BOOLEAN = true OR "isPublished" = true)
      ORDER BY "sortOrder" ASC, "createdAt" DESC
    `
  } catch {
    return []
  }
}
