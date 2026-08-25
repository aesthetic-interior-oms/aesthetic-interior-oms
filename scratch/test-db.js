const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const transactions = await prisma.transaction.findMany({
    where: { leadId: 'cmq3qy12u000004l5m91gald1' },
    include: { recordedBy: { select: { fullName: true } } },
    orderBy: { date: "asc" },
  });
  console.log(transactions);
}
main().catch(console.error).finally(() => prisma.$disconnect());
