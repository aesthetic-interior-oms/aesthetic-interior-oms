import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import prisma from '../lib/prisma'

async function main() {
  const leads = await prisma.lead.findMany({
    take: 10,
    include: { assignments: true }
  })
  console.log("Total leads (sample of 10):", leads.length)
  for (const l of leads) {
    console.log(`Lead ${l.id} - stage: ${l.stage} - subStatus: ${l.subStatus}`)
    console.log(`  Assignments:`, l.assignments.map(a => `${a.department} (${a.userId})`))
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
