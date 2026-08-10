const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const drafts = await prisma.quotationDraft.findMany({
    where: { leadId: 'cmrg52tpy000004l4sbpz51hc' },
    select: { draftKey: true, updatedAt: true }
  });
  console.log('Drafts:', drafts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
