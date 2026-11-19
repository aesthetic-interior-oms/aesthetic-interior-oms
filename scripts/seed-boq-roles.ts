import prisma from '@/lib/prisma'
import { BOQ_TEAM_LEADER_ROLE, BOQ_TEAM_MEMBER_ROLE } from '@/lib/boq-roles'
import { PROCUREMENT_TEAM_LEADER_ROLE, PROCUREMENT_TEAM_MEMBER_ROLE } from '@/lib/procurement-roles'

async function main() {
  console.log('Seeding BOQ roles...')

  const rolesToEnsure = [
    {
      name: BOQ_TEAM_LEADER_ROLE,
      description: 'BOQ Team Leader with project assignment and agreement lead access',
    },
    {
      name: BOQ_TEAM_MEMBER_ROLE,
      description: 'BOQ Team Member assigned to project quantity takeoff and bill of quantities',
    },
    // Also add human readable title variants for user management UI
    {
      name: 'BOQ Team Leader',
      description: 'BOQ Team Leader with project assignment and agreement lead access',
    },
    {
      name: 'BOQ Team Member',
      description: 'BOQ Team Member assigned to project quantity takeoff and bill of quantities',
    },
    { name: PROCUREMENT_TEAM_LEADER_ROLE, description: 'Procurement Team Leader with requisition oversight and delegation access' },
    { name: PROCUREMENT_TEAM_MEMBER_ROLE, description: 'Procurement Team Member assigned pricing, vendor sourcing, and indent work' },
    { name: 'Procurement Team Leader', description: 'Procurement Team Leader with requisition oversight and delegation access' },
    { name: 'Procurement Team Member', description: 'Procurement Team Member assigned pricing, vendor sourcing, and indent work' },
  ]

  for (const role of rolesToEnsure) {
    const upserted = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: {
        name: role.name,
        description: role.description,
      },
    })
    console.log(`✅ Role: ${upserted.name} (${upserted.id})`)
  }

  console.log('\nAll BOQ roles seeded successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
