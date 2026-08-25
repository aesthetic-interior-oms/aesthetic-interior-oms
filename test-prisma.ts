import prisma from './lib/prisma'

async function main() {
  try {
    const tx = await prisma.transaction.findFirst({
      include: {
        visit: true,
        collectedBy: true
      }
    })
    console.log("Prisma test successful")
  } catch(e) {
    console.error("Prisma error:", e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
