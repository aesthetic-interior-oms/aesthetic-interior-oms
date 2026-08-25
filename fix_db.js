const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_utMOqBC3Wc0s@ep-dawn-violet-a1nvgukf.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
  });
  await client.connect();

  const queries = `
-- CreateEnum (safe: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'PROCESSING', 'PARTIAL_PAID', 'FULL_PAID');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ExpenseCategory" AS ENUM ('OFFICE_RENT', 'SALARY', 'SALARY_ADVANCE', 'BONUS', 'ELECTRICITY_BILL', 'WATER_BILL', 'INTERNET_BILL', 'FOOD_ALLOWANCE', 'CLIENT_ENTERTAINMENT', 'PROMOTION', 'MOBILE_RECHARGE', 'OCTANE_FUEL', 'DONATION', 'BOARD_MATERIAL', 'PASTING_BILL', 'FARING', 'HPL', 'LINER', 'LUBER', 'ACRYLIC', 'HARDWARE', 'ELECTRIC_ITEM', 'LIGHTING', 'GLASS', 'TRANSPORT_COST', 'SITE_EXPENSE', 'FACTORY_PAYMENT', 'CARPENTER_PAYMENT', 'PAINT_MATERIALS', 'PAINT_PAYMENT', 'CEILING_PAYMENT', 'DOOR', 'PLUMBER_PAYMENT', 'TILES_PURCHASE', 'FOLDING_DOOR', 'GLASS_PROFILE', 'CIVIL_WORK', 'OTHERS');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'VISIT_DUE_36H'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'VISIT_DUE_48H'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'VISIT_DUE_72H'; EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN ALTER TYPE "PaymentAccount" ADD VALUE 'BANK_EBL'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "PaymentAccount" ADD VALUE 'BANK_OTHER'; EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "accountStatus" "AccountStatus";
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "serialNo" SERIAL NOT NULL, ADD COLUMN IF NOT EXISTS "voucherNo" TEXT;

DO $$ BEGIN
    CREATE UNIQUE INDEX "Transaction_voucherNo_key" ON "Transaction"("voucherNo");
EXCEPTION WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; END $$;
  `;

  console.log('Running queries...');
  try {
      await client.query(queries);
      console.log('Queries executed successfully.');
  } catch (err) {
      console.error('Error executing query:', err);
  }
  
  await client.end();
}
main().catch(console.error);
