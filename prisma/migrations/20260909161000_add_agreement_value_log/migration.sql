-- AlterTable
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "initialAgreementValue" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AgreementValueLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementValueLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgreementValueLog_leadId_idx" ON "AgreementValueLog"("leadId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgreementValueLog_createdById_idx" ON "AgreementValueLog"("createdById");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AgreementValueLog_leadId_fkey'
    ) THEN
        ALTER TABLE "AgreementValueLog" ADD CONSTRAINT "AgreementValueLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AgreementValueLog_createdById_fkey'
    ) THEN
        ALTER TABLE "AgreementValueLog" ADD CONSTRAINT "AgreementValueLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
