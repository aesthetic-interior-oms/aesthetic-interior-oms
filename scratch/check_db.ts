import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import prisma from '../lib/prisma'

async function main() {
  const userCount = await prisma.user.count()
  console.log("Total users:", userCount)
}

main().catch(console.error).finally(() => prisma.$disconnect())
