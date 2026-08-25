-- AlterTable
ALTER TABLE "QuotationTemplateOverride" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "FinanceAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinanceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceAccount_name_key" ON "FinanceAccount"("name");

-- Insert existing accounts into FinanceAccount
INSERT INTO "FinanceAccount" ("id", "name", "updatedAt")
SELECT gen_random_uuid()::text, "account"::text, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "account" FROM "Transaction" WHERE "account" IS NOT NULL) AS t;

-- Add new column
ALTER TABLE "Transaction" ADD COLUMN "financeAccountId" TEXT;

-- Update new column with correct IDs
UPDATE "Transaction"
SET "financeAccountId" = "FinanceAccount"."id"
FROM "FinanceAccount"
WHERE "Transaction"."account"::text = "FinanceAccount"."name";

-- Drop old column
ALTER TABLE "Transaction" DROP COLUMN "account";

-- DropEnum
DROP TYPE "PaymentAccount";

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_financeAccountId_fkey" FOREIGN KEY ("financeAccountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
