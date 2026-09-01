import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' }) // Load the local DB URL

import prisma from '../lib/prisma'

async function main() {
  const completedLeads = await prisma.lead.findMany({
    where: { subStatus: { in: ['QUOTATION_COMPLETED', 'QUOTATION_APPROVED'] } },
    include: { assignments: true, quotationDrafts: true, visits: true }
  })
  console.log("Completed Leads:", completedLeads.length)
  for (const l of completedLeads) {
    console.log(`Lead: ${l.id}, SubStatus: ${l.subStatus}, updated_at: ${l.updated_at}`)
    console.log("  Assignments:", l.assignments.map(a => a.department))
    console.log("  Drafts:", l.quotationDrafts.map(d => d.draftKey))
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
