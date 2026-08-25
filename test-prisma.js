const { PrismaClient } = require('./generated/prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const tx = await prisma.transaction.findFirst({
      include: {
        visit: true,
        collectedBy: true
      }
    })
    console.log("Prisma test successful. Sample transaction:", tx)
  } catch(e) {
    console.error("Prisma error:", e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
