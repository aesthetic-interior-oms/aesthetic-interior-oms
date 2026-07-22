-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TransactionType" AS ENUM ('INFLOW', 'OUTFLOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ExpenseCategory" AS ENUM ('OFFICE_RENT', 'SALARY', 'SALARY_ADVANCE', 'BONUS', 'ELECTRICITY_BILL', 'WATER_BILL', 'INTERNET_BILL', 'FOOD_ALLOWANCE', 'CLIENT_ENTERTAINMENT', 'PROMOTION', 'MOBILE_RECHARGE', 'OCTANE_FUEL', 'DONATION', 'BOARD_MATERIAL', 'PASTING_BILL', 'FARING', 'HPL', 'LINER', 'LUBER', 'ACRYLIC', 'HARDWARE', 'ELECTRIC_ITEM', 'LIGHTING', 'GLASS', 'TRANSPORT_COST', 'SITE_EXPENSE', 'FACTORY_PAYMENT', 'CARPENTER_PAYMENT', 'PAINT_MATERIALS', 'PAINT_PAYMENT', 'CEILING_PAYMENT', 'DOOR', 'PLUMBER_PAYMENT', 'TILES_PURCHASE', 'FOLDING_DOOR', 'GLASS_PROFILE', 'CIVIL_WORK', 'OTHERS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PaymentAccount" AS ENUM ('CASH', 'BANK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "TransactionType" NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "particular" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "account" "PaymentAccount" NOT NULL,
    "recordedById" TEXT NOT NULL,
    "leadId" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CashFlowDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openingCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "openingBank" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingBank" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CashFlowDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_leadId_idx" ON "Transaction"("leadId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_recordedById_idx" ON "Transaction"("recordedById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CashFlowDaily_date_key" ON "CashFlowDaily"("date");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
