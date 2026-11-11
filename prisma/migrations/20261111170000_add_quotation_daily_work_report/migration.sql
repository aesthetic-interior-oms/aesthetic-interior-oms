-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuotationWorkType') THEN
    CREATE TYPE "QuotationWorkType" AS ENUM ('DETAIL', 'SHORT', 'FURNITURE', 'ELECTRICAL');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "QuotationDailyWorkReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "dateKey" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "workType" "QuotationWorkType" NOT NULL DEFAULT 'DETAIL',
    "sqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isAutoDetected" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationDailyWorkReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "QuotationDailyWorkReport_userId_leadId_dateKey_workType_key" ON "QuotationDailyWorkReport"("userId", "leadId", "dateKey", "workType");
CREATE INDEX IF NOT EXISTS "QuotationDailyWorkReport_userId_dateKey_idx" ON "QuotationDailyWorkReport"("userId", "dateKey");
CREATE INDEX IF NOT EXISTS "QuotationDailyWorkReport_userId_weekKey_idx" ON "QuotationDailyWorkReport"("userId", "weekKey");
CREATE INDEX IF NOT EXISTS "QuotationDailyWorkReport_leadId_idx" ON "QuotationDailyWorkReport"("leadId");
CREATE INDEX IF NOT EXISTS "QuotationDailyWorkReport_dateKey_idx" ON "QuotationDailyWorkReport"("dateKey");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuotationDailyWorkReport_userId_fkey'
  ) THEN
    ALTER TABLE "QuotationDailyWorkReport" ADD CONSTRAINT "QuotationDailyWorkReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuotationDailyWorkReport_leadId_fkey'
  ) THEN
    ALTER TABLE "QuotationDailyWorkReport" ADD CONSTRAINT "QuotationDailyWorkReport_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "QuotationWorkActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "workType" "QuotationWorkType" NOT NULL,
    "activityDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateKey" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationWorkActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuotationWorkActivityLog_userId_dateKey_idx" ON "QuotationWorkActivityLog"("userId", "dateKey");
CREATE INDEX IF NOT EXISTS "QuotationWorkActivityLog_leadId_idx" ON "QuotationWorkActivityLog"("leadId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuotationWorkActivityLog_userId_fkey'
  ) THEN
    ALTER TABLE "QuotationWorkActivityLog" ADD CONSTRAINT "QuotationWorkActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'QuotationWorkActivityLog_leadId_fkey'
  ) THEN
    ALTER TABLE "QuotationWorkActivityLog" ADD CONSTRAINT "QuotationWorkActivityLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
