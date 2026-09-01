const { PrismaClient } = require('../generated/prisma')
const prisma = new PrismaClient()

async function main() {
  const leads = await prisma.lead.findMany({
    where: {
      subStatus: { in: ['QUOTATION_COMPLETED', 'QUOTATION_APPROVED'] }
    },
    include: {
      quotationDrafts: true,
      visits: true,
      assignments: true
    },
    take: 5
  })
  console.log("Found completed leads: " + leads.length)
  leads.forEach(l => {
    console.log(`Lead ${l.id} - SubStatus: ${l.subStatus} - Drafts: ${l.quotationDrafts.map(d => d.draftKey).join(', ')} - Visits Sqft: ${l.visits[0]?.projectSqft}`)
  })

  const drafts = await prisma.quotationDraft.findMany({
    take: 5,
    include: { lead: { select: { subStatus: true } } }
  })
  console.log("\nSome Drafts in DB:")
  drafts.forEach(d => {
    console.log(`Lead ID: ${d.leadId} - subStatus: ${d.lead.subStatus} - draftKey: ${d.draftKey} - Sqft: ${d.projectSqft}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
