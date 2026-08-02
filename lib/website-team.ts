import prisma from '@/lib/prisma'

export type WebsiteTeamMember = {
  id: string
  name: string
  role: string
  image: string
  specialty: string | null
  quote: string | null
  isPublished: boolean
  sortOrder: number
}

type WebsiteTeamMemberRow = WebsiteTeamMember

function normalizeTeamMember(row: WebsiteTeamMemberRow): WebsiteTeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    image: row.image,
    specialty: row.specialty,
    quote: row.quote,
    isPublished: row.isPublished,
    sortOrder: row.sortOrder,
  }
}

export async function getWebsiteTeamMembers({ includeDrafts = false } = {}) {
  const rows = await prisma.$queryRaw<WebsiteTeamMemberRow[]>`
    SELECT
      "id",
      "name",
      "role",
      "image",
      "specialty",
      "quote",
      "isPublished",
      "sortOrder"
    FROM "WebsiteTeamMember"
    WHERE (${includeDrafts}::BOOLEAN = true OR "isPublished" = true)
    ORDER BY "sortOrder" ASC, "createdAt" ASC
  `

  return rows.map(normalizeTeamMember)
}
