import prisma from '../lib/prisma';

async function main() {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { leadId: 'cmq3qy12u000004l5m91gald1' },
      include: { recordedBy: { select: { fullName: true } } },
      orderBy: { date: "asc" },
    });
    console.log("TRANSACTIONS: ", transactions);
    
    const lead = await prisma.lead.findUnique({
      where: { id: 'cmq3qy12u000004l5m91gald1' },
      select: { id: true, name: true, phone: true, location: true, budget: true, agreementValue: true },
    })
    console.log("LEAD: ", lead);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
