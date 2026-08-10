import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_ZXUAWEy9z4ho@ep-broad-wind-a1x6mkah.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' })
async function main() {
  await client.connect()
  const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public';")
  console.log(res.rows.map(r => r.tablename).join(', '))
  await client.end()
}
main().catch(console.error)
