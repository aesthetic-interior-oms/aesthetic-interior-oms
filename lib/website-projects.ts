import prisma from "@/lib/prisma"

export type ProjectCategory = "residential" | "commercial" | "renovation" | "furniture"

export type WebsiteProject = {
  id: string
  slug: string
  title: string
  ownerName: string | null
  type: string | null
  sqft: string | null
  duration: string | null
  category: ProjectCategory
  location: string | null
  bannerImage: string
  images: string[]
  description: string
  details: string | null
  isPublished: boolean
  sortOrder: number
}

type WebsiteProjectRow = {
  id: string
  slug: string
  title: string
  ownerName: string | null
  type: string | null
  sqft: string | null
  duration: string | null
  category: string
  location: string | null
  thumbnailUrl: string
  description: string
  details: string | null
  isPublished: boolean
  sortOrder: number
  images: string[] | null
}

function normalizeProject(row: WebsiteProjectRow): WebsiteProject {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    ownerName: row.ownerName,
    type: row.type,
    sqft: row.sqft,
    duration: row.duration,
    category: row.category as ProjectCategory,
    location: row.location,
    bannerImage: row.thumbnailUrl,
    images: row.images?.length ? row.images : [row.thumbnailUrl],
    description: row.description,
    details: row.details,
    isPublished: row.isPublished,
    sortOrder: row.sortOrder,
  }
}

export async function getWebsiteProjects({ includeDrafts = false } = {}) {
  const rows = await prisma.$queryRaw<WebsiteProjectRow[]>`
    SELECT
      p."id",
      p."slug",
      p."title",
      p."ownerName",
      p."type",
      p."sqft",
      p."duration",
      p."category",
      p."location",
      p."thumbnailUrl",
      p."description",
      p."details",
      p."isPublished",
      p."sortOrder",
      COALESCE(
        array_agg(i."url" ORDER BY i."sortOrder", i."createdAt") FILTER (WHERE i."url" IS NOT NULL),
        ARRAY[]::TEXT[]
      ) AS "images"
    FROM "WebsiteProject" p
    LEFT JOIN "WebsiteProjectImage" i ON i."projectId" = p."id"
    WHERE (${includeDrafts}::BOOLEAN = true OR p."isPublished" = true)
    GROUP BY p."id"
    ORDER BY p."sortOrder" ASC, p."createdAt" DESC
  `

  return rows.map(normalizeProject)
}

export async function getProjectBySlug(slug: string, { includeDrafts = false } = {}) {
  const rows = await prisma.$queryRaw<WebsiteProjectRow[]>`
    SELECT
      p."id",
      p."slug",
      p."title",
      p."ownerName",
      p."type",
      p."sqft",
      p."duration",
      p."category",
      p."location",
      p."thumbnailUrl",
      p."description",
      p."details",
      p."isPublished",
      p."sortOrder",
      COALESCE(
        array_agg(i."url" ORDER BY i."sortOrder", i."createdAt") FILTER (WHERE i."url" IS NOT NULL),
        ARRAY[]::TEXT[]
      ) AS "images"
    FROM "WebsiteProject" p
    LEFT JOIN "WebsiteProjectImage" i ON i."projectId" = p."id"
    WHERE p."slug" = ${slug} AND (${includeDrafts}::BOOLEAN = true OR p."isPublished" = true)
    GROUP BY p."id"
    LIMIT 1
  `

  return rows[0] ? normalizeProject(rows[0]) : null
}
