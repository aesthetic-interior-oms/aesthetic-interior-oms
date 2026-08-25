const { PrismaClient } = require('./generated/prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Starting finance accounts migration...')
  const accounts = ['CASH', 'BANK_EBL', 'BANK_OTHER']
  const createdAccounts = {}

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
  for (const tx of transactions) {
    const mappedAccount = createdAccounts[tx.account]
    if (mappedAccount) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { financeAccountId: mappedAccount.id },
      })
      updatedCount++
    }
  }
  console.log(`Migration completed! Updated ${updatedCount} transactions.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
