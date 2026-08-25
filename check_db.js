const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  const columns = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'Transaction'`;
  console.log('Transaction columns:', columns.map(c => c.column_name));
  const migrations = await prisma.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5`;
  console.log('Migrations:', migrations);
}
main().catch(console.error).finally(() => prisma.$disconnect());
