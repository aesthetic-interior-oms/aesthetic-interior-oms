import prisma from '../lib/prisma'

const PRELIMINARY_STOCKS = [
  { name: 'Tissue', balance: 13, category: 'PANTRY_HYGIENE', unit: 'box', sku: 'STK-PNTR-001' },
  { name: 'A4 Paper', balance: 4, category: 'STATIONERY_OFFICE', unit: 'rim', sku: 'STK-STAT-001' },
  { name: 'Sugar', balance: 0, category: 'PANTRY_HYGIENE', unit: 'kg', sku: 'STK-PNTR-002' },
  { name: 'Tea Leaf', balance: 4, category: 'PANTRY_HYGIENE', unit: 'pkt', sku: 'STK-PNTR-003' },
  { name: 'Toilet Tissue', balance: 28, category: 'PANTRY_HYGIENE', unit: 'roll', sku: 'STK-PNTR-004' },
  { name: 'Biscuits', balance: 7, category: 'PANTRY_HYGIENE', unit: 'pkt', sku: 'STK-PNTR-005' },
  { name: 'Diary', balance: 10, category: 'STATIONERY_OFFICE', unit: 'pcs', sku: 'STK-STAT-002' },
  { name: 'Fold File', balance: 12, category: 'STATIONERY_OFFICE', unit: 'pcs', sku: 'STK-STAT-003' },
  { name: 'Mouse Pad', balance: 3, category: 'IT_EQUIPMENT', unit: 'pcs', sku: 'STK-IT-001' },
  { name: 'Punch file', balance: 24, category: 'STATIONERY_OFFICE', unit: 'pcs', sku: 'STK-STAT-004' },
  { name: 'Bleaching Powder', balance: 5, category: 'PANTRY_HYGIENE', unit: 'pkt', sku: 'STK-PNTR-006' },
  { name: 'Vixol', balance: 2, category: 'PANTRY_HYGIENE', unit: 'bottle', sku: 'STK-PNTR-007' },
  { name: 'Harpic', balance: 4, category: 'PANTRY_HYGIENE', unit: 'bottle', sku: 'STK-PNTR-008' },
  { name: 'Odonil', balance: 6, category: 'PANTRY_HYGIENE', unit: 'pcs', sku: 'STK-PNTR-009' },
  { name: 'Headphones', balance: 2, category: 'IT_EQUIPMENT', unit: 'pcs', sku: 'STK-IT-002' },
  { name: 'Eraser', balance: 3, category: 'STATIONERY_OFFICE', unit: 'pcs', sku: 'STK-STAT-005' },
  { name: 'Sharpner', balance: 5, category: 'STATIONERY_OFFICE', unit: 'pcs', sku: 'STK-STAT-006' },
  { name: 'Sketch Book', balance: 3, category: 'STATIONERY_OFFICE', unit: 'pcs', sku: 'STK-STAT-007' },
  { name: 'Highlighter', balance: 5, category: 'STATIONERY_OFFICE', unit: 'pcs', sku: 'STK-STAT-008' },
  { name: 'Stapler Pin Box', balance: 6, category: 'STATIONERY_OFFICE', unit: 'box', sku: 'STK-STAT-009' },
  { name: 'Pencil', balance: 16, category: 'STATIONERY_OFFICE', unit: 'pcs', sku: 'STK-STAT-010' },
  { name: 'Mouse', balance: 2, category: 'IT_EQUIPMENT', unit: 'pcs', sku: 'STK-IT-003' },
  { name: 'Note pad', balance: 3, category: 'STATIONERY_OFFICE', unit: 'pcs', sku: 'STK-STAT-011' },
  { name: 'Towel', balance: 9, category: 'PANTRY_HYGIENE', unit: 'pcs', sku: 'STK-PNTR-010' },
] as const

async function main() {
  console.log('Seeding preliminary stock items into the database...')

  // Find an admin/system user for movement logs if available
  const adminUser = await prisma.user.findFirst({
    where: { isActive: true },
    select: { id: true },
  })

  if (!adminUser) {
    console.error('No active user found in database to attribute stock movements.')
    process.exit(1)
  }

  let createdCount = 0
  let updatedCount = 0

  for (const item of PRELIMINARY_STOCKS) {
    const existing = await prisma.stockItem.findFirst({
      where: {
        OR: [
          { sku: item.sku },
          { name: { equals: item.name, mode: 'insensitive' } },
        ],
      },
    })

    if (existing) {
      await prisma.stockItem.update({
        where: { id: existing.id },
        data: {
          currentStock: item.balance,
          category: item.category,
          unit: item.unit,
          location: 'HR & Office Store',
        },
      })
      console.log(`Updated stock item: ${item.name} -> Balance: ${item.balance}`)
      updatedCount++
    } else {
      const createdItem = await prisma.stockItem.create({
        data: {
          sku: item.sku,
          name: item.name,
          category: item.category,
          unit: item.unit,
          currentStock: item.balance,
          minStockAlert: 5,
          unitCostPrice: 0,
          location: 'HR & Office Store',
          description: 'Initial preliminary stock inventory entry',
        },
      })

      if (item.balance > 0) {
        await prisma.stockMovement.create({
          data: {
            stockItemId: createdItem.id,
            type: 'STOCK_IN',
            quantity: item.balance,
            unitCost: 0,
            totalValue: 0,
            department: 'Human_Resources',
            createdById: adminUser.id,
            notes: 'Initial preliminary stock inventory balance',
          },
        })
      }

      console.log(`Created stock item: ${item.name} (${item.sku}) -> Balance: ${item.balance}`)
      createdCount++
    }
  }

  console.log(`\nStock seeding complete! Created: ${createdCount}, Updated: ${updatedCount}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Error seeding stock items:', err)
  process.exit(1)
})
