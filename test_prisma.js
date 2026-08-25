const { PrismaClient } = require("./generated/prisma/client/index.js");
const prisma = new PrismaClient();
prisma.transaction.findMany({ take: 1, include: { lead: true, recordedBy: true, collectedBy: true, visit: true, financeAccount: true } })
  .then(console.log)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
