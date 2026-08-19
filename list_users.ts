import prisma from './lib/prisma'

async function main() {
  const users = await prisma.user.findMany({
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  })

  console.log(JSON.stringify(users, null, 2))
}

main()
