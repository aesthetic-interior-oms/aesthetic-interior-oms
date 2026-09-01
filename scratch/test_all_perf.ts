import prisma from '../lib/prisma'

async function main() {
  const leads = await prisma.lead.findMany({
    where: {
      assignments: {
        some: {
          department: 'QUOTATION'
        }
      }
    },
    include: {
      assignments: true,
      quotationDrafts: true
    }
  })
  console.log(`Found ${leads.length} leads assigned to QUOTATION overall.`)
  for (const l of leads) {
    console.log(`Lead ${l.id} - updated_at: ${l.updated_at} - subStatus: ${l.subStatus}`)
    for (const d of l.quotationDrafts) {
       console.log(`  Draft: ${d.draftKey} - sqft: ${d.projectSqft}`)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
