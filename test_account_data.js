const { Pool } = require("pg");
require("dotenv").config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT account FROM "Transaction" LIMIT 5');
    console.table(res.rows);
  } catch(e) {
    console.error(e.message);
  }
  await pool.end();
}
main();
