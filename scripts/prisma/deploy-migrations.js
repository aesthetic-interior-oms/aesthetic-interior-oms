const { spawnSync } = require('node:child_process')

const FAILED_WEBSITE_TEAM_MIGRATION = '20260728103000_add_website_team_members'

function runPrisma(args) {
  const result = spawnSync('npx', ['prisma', ...args], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })

  if (result.stdout) {
    process.stdout.write(result.stdout)
  }

  if (result.stderr) {
    process.stderr.write(result.stderr)
  }

  return result
}

function outputFor(result) {
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`
}

let deploy = runPrisma(['migrate', 'deploy'])

if (deploy.status === 0) {
  process.exit(0)
}

const deployOutput = outputFor(deploy)
const isRecoverableWebsiteTeamFailure =
  deployOutput.includes('P3009') &&
  deployOutput.includes(FAILED_WEBSITE_TEAM_MIGRATION)

if (!isRecoverableWebsiteTeamFailure) {
  process.exit(deploy.status ?? 1)
}

console.log(
  `Detected failed Prisma migration ${FAILED_WEBSITE_TEAM_MIGRATION}; marking it rolled back before retrying deploy.`,
)

const resolve = runPrisma([
  'migrate',
  'resolve',
  '--rolled-back',
  FAILED_WEBSITE_TEAM_MIGRATION,
])

if (resolve.status !== 0) {
  process.exit(resolve.status ?? 1)
}

deploy = runPrisma(['migrate', 'deploy'])
process.exit(deploy.status ?? 1)
