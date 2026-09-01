import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import prisma from '../lib/prisma'

async function main() {
  const userCount = await prisma.user.count()
  const leadCount = await prisma.lead.count()
  const assignmentCount = await prisma.leadAssignment.count()
  const draftCount = await prisma.quotationDraft.count()
  
  console.log("=== Database Summary ===")
  console.log("Users:", userCount)
  console.log("Leads:", leadCount)
  console.log("LeadAssignments:", assignmentCount)
  console.log("QuotationDrafts:", draftCount)
  
  if (draftCount > 0) {
    const drafts = await prisma.quotationDraft.findMany({
      include: { lead: { select: { subStatus: true, stage: true } } }
    })
    console.log("\n=== Drafts ===")
    drafts.forEach(d => {
      console.log(`draftKey: ${d.draftKey} | leadId: ${d.leadId} | sqft: ${d.projectSqft} | leadSubStatus: ${d.lead.subStatus}`)
    })
  }
  
  if (assignmentCount > 0) {
    const assignments = await prisma.leadAssignment.findMany()
    console.log("\n=== Assignments ===")
    assignments.forEach(a => {
      console.log(`leadId: ${a.leadId} | userId: ${a.userId} | dept: ${a.department}`)
    })
  }
  
  if (leadCount > 0) {
    const leads = await prisma.lead.findMany({ take: 10 })
    console.log("\n=== Leads ===")
    leads.forEach(l => {
      console.log(`id: ${l.id} | stage: ${l.stage} | subStatus: ${l.subStatus} | updated_at: ${l.updated_at}`)
    })
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
