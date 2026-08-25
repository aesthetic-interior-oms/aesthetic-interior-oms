const { Pool } = require("pg");
require("dotenv").config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'Transaction'");
    console.log("Columns in Transaction table:");
    console.table(res.rows);
  } catch(e) {
    console.error("Failed to fetch columns:", e);
  }

  await pool.end();
}
main();
