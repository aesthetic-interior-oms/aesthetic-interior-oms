-- CreateEnum
CREATE TYPE "MaterialItemStatus" AS ENUM ('NOTED', 'BILLED', 'PURCHASED', 'DELIVERED', 'APPLIED', 'STORED');

-- AlterTable
ALTER TABLE "MaterialRequisitionItem"
  ADD COLUMN "status" "MaterialItemStatus" NOT NULL DEFAULT 'NOTED',
  ADD COLUMN "purchasedQuantity" DOUBLE PRECISION,
  ADD COLUMN "purchasedAt" TIMESTAMP(3);

-- Backfill existing billed items to BILLED
UPDATE "MaterialRequisitionItem" mri
SET "status" = 'BILLED'
WHERE EXISTS (
  SELECT 1 FROM "MaterialIndentItem" mii WHERE mii."requisitionItemId" = mri."id"
);

-- CreateIndex
CREATE INDEX "MaterialRequisitionItem_status_idx" ON "MaterialRequisitionItem"("status");
