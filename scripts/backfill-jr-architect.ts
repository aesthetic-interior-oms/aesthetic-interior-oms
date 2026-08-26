import prisma from '../lib/prisma'
import { updateJrArchitectPerformance } from '../lib/jr-architect-performance'

async function main() {
  console.log('Fetching Jr Architects...')
  const jrArchitects = await prisma.user.findMany({
    where: {
      userDepartments: {
        some: {
          department: { name: 'JR_ARCHITECT' }
        }
      }
    }
  })

  console.log(`Found ${jrArchitects.length} Jr Architects.`)

  for (const user of jrArchitects) {
    console.log(`Backfilling for: ${user.fullName} (${user.id})`)
    await updateJrArchitectPerformance(user.id)
  }

  console.log('Backfill complete.')
  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
