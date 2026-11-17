import prisma from '@/lib/prisma'
import { BOQ_TEAM_LEADER_ROLE, BOQ_TEAM_MEMBER_ROLE } from '@/lib/boq-roles'

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
