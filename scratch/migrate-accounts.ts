import prisma from '../lib/prisma'

async function main() {
  console.log('Starting finance accounts migration...')
  const accounts = ['CASH', 'BANK_EBL', 'BANK_OTHER']
  const createdAccounts: Record<string, any> = {}

  for (const name of accounts) {
    const created = await prisma.financeAccount.upsert({
      where: { name },
      update: {},
      create: { name },
    })
    createdAccounts[name] = created
    console.log(`Account ${name} -> ID: ${created.id}`)
  }

  const transactions = await prisma.transaction.findMany({
    where: { financeAccountId: null },
  })

  console.log(`Found ${transactions.length} transactions to update.`)
  let updatedCount = 0
  // Migration already ran; account field has been removed from schema.
  console.log('Migration script is now a no-op — migration was already applied.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
