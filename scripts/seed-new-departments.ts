import prisma from '@/lib/prisma'
import { STANDARD_DEPARTMENTS } from '@/lib/ensure-departments'

async function main() {
  console.log('Seeding departments...')
  for (const dept of STANDARD_DEPARTMENTS) {
    const result = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: {
        name: dept.name,
        description: dept.description,
      },
    })
    console.log(`✅ ${result.name} — ${result.id}`)
  }
  console.log('\nAll departments seeded successfully.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
