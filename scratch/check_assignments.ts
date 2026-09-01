import prisma from '../lib/prisma'

async function main() {
  const assignments = await prisma.leadAssignment.findMany({
    take: 10
  })
  console.log("Assignments:")
  console.log(assignments)

  const completedLeads = await prisma.lead.findMany({
    where: { subStatus: { in: ['QUOTATION_COMPLETED', 'QUOTATION_APPROVED'] } },
    include: { assignments: true, quotationDrafts: true }
  })
  console.log("Completed Leads:")
  console.log(completedLeads.length)
  for (const l of completedLeads) {
    console.log(`Lead: ${l.id}, SubStatus: ${l.subStatus}, updated_at: ${l.updated_at}`)
    console.log("Assignments:", l.assignments)
    console.log("Drafts:", l.quotationDrafts.map(d => d.draftKey))
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
