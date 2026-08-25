const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_utMOqBC3Wc0s@ep-dawn-violet-a1nvgukf.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
  });
  await client.connect();
  
  const colsRes = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'Transaction'");
  console.log('Transaction columns:', colsRes.rows.map(r => r.column_name));
  
  const migRes = await client.query("SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5");
  console.log('Migrations:', migRes.rows);
  
  await client.end();
}
main().catch(console.error);
