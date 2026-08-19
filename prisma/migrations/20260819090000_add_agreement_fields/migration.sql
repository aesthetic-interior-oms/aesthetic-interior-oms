-- AddColumn: agreementType and agreementValue to Lead table
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "agreementType" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "agreementValue" DOUBLE PRECISION;
