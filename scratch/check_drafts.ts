import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const drafts = await prisma.quotationDraft.findMany({
    take: 10,
    select: {
      draftKey: true,
      projectSqft: true,
      status: true,
      leadId: true,
    }
  })
  console.log(drafts)
}

main().catch(console.error).finally(() => prisma.$disconnect())
