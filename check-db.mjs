import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient()
async function main() {
  try {
    const res = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public';`
    console.log(res.map(r => r.tablename).join(', '))
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}
main()
