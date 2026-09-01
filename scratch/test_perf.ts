import { syncAllQuotationTeamPerformance } from '../lib/quotation-performance'
import prisma from '../lib/prisma'

async function main() {
  const augustDate = new Date(2026, 7, 15) // August 2026
  console.log("Running for August...")
  const results = await syncAllQuotationTeamPerformance(augustDate)
  console.log("Results:", results)
}

main().catch(console.error).finally(() => prisma.$disconnect())
