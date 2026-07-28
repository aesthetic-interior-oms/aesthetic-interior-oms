import prisma from "@/lib/prisma"

export type WebsiteTeamMember = {
  id: string
  name: string
  role: string
  image: string
  specialty: string
  quote: string
  isPublished: boolean
  sortOrder: number
}

export const defaultWebsiteTeamMembers: WebsiteTeamMember[] = [
  { id: "nazrul-islam", name: "Nazrul Islam", role: "General Manager", image: "/user/User1.jpg", specialty: "Administration Department", quote: "We believe every project should reflect trust, clarity, and long-term value for our clients.", isPublished: true, sortOrder: 0 },
  { id: "arup-ratan-mandal", name: "Arup Ratan Mandal", role: "Assistant General Manager", image: "/user/User4.jpg", specialty: "Administration Department", quote: "Our strength is teamwork, where every department works together to deliver a smooth client experience.", isPublished: true, sortOrder: 1 },
  { id: "jannatul-ferdous-urmi", name: "Jannatul Ferdous Urmi", role: "Senior Architect", image: "/user/User2.jpg", specialty: "Architect Department", quote: "Good design starts with listening deeply and turning each client vision into functional beauty.", isPublished: true, sortOrder: 2 },
  { id: "james", name: "James", role: "Project Cordinator", image: "/user/User3.jpg", specialty: "Execution Department", quote: "Execution quality and timeline discipline are the promises we bring to every project site.", isPublished: true, sortOrder: 3 },
  { id: "faima-shorna", name: "Faima Shorna", role: "HR Administration", image: "/user/User5.jpeg", specialty: "Human Resources Department", quote: "A strong company culture helps us serve clients better and grow as a dependable design team.", isPublished: true, sortOrder: 4 },
  { id: "moriom-ritu", name: "Moriom Ritu", role: "Junior Executive", image: "/user/User6.jpeg", specialty: "Client Relationship Management", quote: "Clear communication and care for client needs are at the center of everything we do.", isPublished: true, sortOrder: 5 },
  { id: "ovijit-chowdhury", name: "Ovijit Chowdhury", role: "Junior Architect", image: "/user/User7.jpeg", specialty: "Architect Department", quote: "We focus on meaningful details so every space feels thoughtful, practical, and timeless.", isPublished: true, sortOrder: 6 },
]

type WebsiteTeamMemberRow = WebsiteTeamMember

export async function getWebsiteTeamMembers({ includeDrafts = false } = {}) {
  const rows = await prisma.$queryRaw<WebsiteTeamMemberRow[]>`
    SELECT "id", "name", "role", "image", "specialty", "quote", "isPublished", "sortOrder"
    FROM "WebsiteTeamMember"
    WHERE (${includeDrafts}::BOOLEAN = true OR "isPublished" = true)
    ORDER BY "sortOrder" ASC, "createdAt" ASC
  `

  return rows.length || includeDrafts ? rows : defaultWebsiteTeamMembers
}
