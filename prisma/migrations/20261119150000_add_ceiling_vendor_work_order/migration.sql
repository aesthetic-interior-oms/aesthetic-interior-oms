-- AlterTable: Drop unique vendorId_leadId constraint to support multiple work orders per project/vendor
ALTER TABLE "VendorAgreement" DROP CONSTRAINT IF EXISTS "VendorAgreement_vendorId_leadId_key";
DROP INDEX IF EXISTS "VendorAgreement_vendorId_leadId_key";

-- AlterTable: Add work order and ceiling workflow tracking columns
ALTER TABLE "VendorAgreement" ADD COLUMN IF NOT EXISTS "workOrderNo" TEXT;
ALTER TABLE "VendorAgreement" ADD COLUMN IF NOT EXISTS "quotationLineItemId" TEXT;
ALTER TABLE "VendorAgreement" ADD COLUMN IF NOT EXISTS "workCategory" "RequisitionWorkCategory";
ALTER TABLE "VendorAgreement" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VendorAgreement_workOrderNo_key" ON "VendorAgreement"("workOrderNo");
CREATE INDEX IF NOT EXISTS "VendorAgreement_quotationLineItemId_idx" ON "VendorAgreement"("quotationLineItemId");
CREATE INDEX IF NOT EXISTS "VendorAgreement_workCategory_idx" ON "VendorAgreement"("workCategory");
CREATE INDEX IF NOT EXISTS "VendorAgreement_createdById_idx" ON "VendorAgreement"("createdById");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'VendorAgreement_createdById_fkey'
  ) THEN
    ALTER TABLE "VendorAgreement" ADD CONSTRAINT "VendorAgreement_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
