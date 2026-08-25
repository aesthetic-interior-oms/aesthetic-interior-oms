const { PrismaClient } = require("./generated/prisma/index.js");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Testing basic query...");
  try {
    await prisma.transaction.findMany({ take: 1 });
    console.log("Basic query OK");
  } catch(e) { console.error("Basic query failed:", e.message); }

  console.log("Testing include lead...");
  try {
    await prisma.transaction.findMany({ take: 1, include: { lead: true } });
    console.log("Include lead OK");
  } catch(e) { console.error("Include lead failed:", e.message); }

  console.log("Testing include recordedBy...");
  try {
    await prisma.transaction.findMany({ take: 1, include: { recordedBy: true } });
    console.log("Include recordedBy OK");
  } catch(e) { console.error("Include recordedBy failed:", e.message); }

  console.log("Testing include collectedBy...");
  try {
    await prisma.transaction.findMany({ take: 1, include: { collectedBy: true } });
    console.log("Include collectedBy OK");
  } catch(e) { console.error("Include collectedBy failed:", e.message); }

  console.log("Testing include visit...");
  try {
    await prisma.transaction.findMany({ take: 1, include: { visit: true } });
    console.log("Include visit OK");
  } catch(e) { console.error("Include visit failed:", e.message); }

  console.log("Testing include financeAccount...");
  try {
    await prisma.transaction.findMany({ take: 1, include: { financeAccount: true } });
    console.log("Include financeAccount OK");
  } catch(e) { console.error("Include financeAccount failed:", e.message); }

  console.log("Testing groupBy...");
  try {
    await prisma.transaction.groupBy({
        by: ["type", "financeAccountId"],
        _sum: { amount: true },
    });
    console.log("groupBy OK");
  } catch(e) { console.error("groupBy failed:", e.message); }

  await prisma.$disconnect();
}
main();
