process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_ZXUAWEy9z4ho@ep-broad-wind-a1x6mkah.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const userCount = await prisma.user.count()
  const leadCount = await prisma.lead.count()
  const assignmentCount = await prisma.leadAssignment.count()
  const draftCount = await prisma.quotationDraft.count()
  
  console.log("=== DB Summary ===")
  console.log("Users:", userCount)
  console.log("Leads:", leadCount)
  console.log("LeadAssignments:", assignmentCount)
  console.log("QuotationDrafts:", draftCount)
  
  if (draftCount > 0) {
    const drafts = await prisma.quotationDraft.findMany({
      include: { lead: { select: { subStatus: true, stage: true } } }
    })
    console.log("\n=== Drafts ===")
    drafts.forEach((d: any) => {
      console.log(`draftKey: ${d.draftKey} | sqft: ${d.projectSqft} | leadSubStatus: ${d.lead.subStatus}`)
    })
  }
  
  if (leadCount > 0) {
    const leads = await prisma.lead.findMany({ take: 20 })
    leads.forEach((l: any) => {
      console.log(`id: ${l.id} | stage: ${l.stage} | subStatus: ${l.subStatus} | updated: ${l.updated_at}`)
    })
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
