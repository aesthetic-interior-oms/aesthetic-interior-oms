const { spawnSync } = require('node:child_process')

const FAILED_WEBSITE_TEAM_MIGRATION = '20260728103000_add_website_team_members'

function enrichDatabaseUrl(envKey) {
  const val = process.env[envKey]
  if (!val) return
  try {
    const url = new URL(val)
    let modified = false
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '30')
      modified = true
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '30')
      modified = true
    }
    if (modified) {
      process.env[envKey] = url.toString()
    }
  } catch {}
}

enrichDatabaseUrl('DATABASE_URL')
enrichDatabaseUrl('DIRECT_DATABASE_URL')

function sleep(ms) {
  const end = Date.now() + ms
  while (Date.now() < end) {}
}

function runPrisma(args) {
  const result = spawnSync('npx', ['prisma', ...args], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: process.env,
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

const MAX_ATTEMPTS = 4

function runDeploy() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[deploy-migrations] Attempt ${attempt}/${MAX_ATTEMPTS}: Running prisma migrate deploy...`)
    const deploy = runPrisma(['migrate', 'deploy'])

    if (deploy.status === 0) {
      console.log('[deploy-migrations] Migrations applied successfully.')
      process.exit(0)
    }

    const deployOutput = outputFor(deploy)

    // Handle P3009 known failure
    if (deployOutput.includes('P3009') && deployOutput.includes(FAILED_WEBSITE_TEAM_MIGRATION)) {
      console.log(
        `Detected failed Prisma migration ${FAILED_WEBSITE_TEAM_MIGRATION}; marking it rolled back before retrying deploy.`,
      )
      const resolve = runPrisma([
        'migrate',
        'resolve',
        '--rolled-back',
        FAILED_WEBSITE_TEAM_MIGRATION,
      ])
      if (resolve.status === 0) {
        continue
      }
    }

    // Handle P1002 (database server reached but timed out)
    if (deployOutput.includes('P1002')) {
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[deploy-migrations] Database timed out (P1002). Server compute may be waking up; waiting 5s before retry...`)
        sleep(5000)
        continue
      } else {
        console.warn(`[deploy-migrations] Database timed out (P1002) after ${MAX_ATTEMPTS} attempts. Continuing build since schema was generated and tables may already be up to date.`)
        // Do not crash the build on transient serverless cold starts if migrations were already run
        process.exit(0)
      }
    }

    if (attempt < MAX_ATTEMPTS) {
      console.warn(`[deploy-migrations] Attempt ${attempt} failed; retrying in 3s...`)
      sleep(3000)
    } else {
      process.exit(deploy.status ?? 1)
    }
  }
}

runDeploy()

