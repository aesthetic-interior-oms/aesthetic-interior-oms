import { PrismaClient } from './generated/prisma'

const prisma = new PrismaClient()

async function main() {
  const tokens = await prisma.deviceToken.findMany()
  console.log("Tokens found:", tokens.length)
  console.log(tokens)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
