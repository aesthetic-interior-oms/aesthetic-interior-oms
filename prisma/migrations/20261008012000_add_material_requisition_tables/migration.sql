-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RequisitionWorkCategory" AS ENUM ('CEILING', 'WALL_PANELING', 'CABINETS_CLOSETS', 'FURNITURE', 'ACCESSORIES', 'ELECTRICAL_WORK', 'PAINT', 'APPLIANCES');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "RequisitionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_PROCUREMENT', 'FULFILLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterEnum
ALTER TYPE "LeadAssignmentDepartment" ADD VALUE IF NOT EXISTS 'PROCUREMENT';

-- CreateTable
CREATE TABLE IF NOT EXISTS "MaterialRequisition" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "quotationDraftId" TEXT,
    "requisitionNo" TEXT NOT NULL,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MaterialRequisitionItem" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "quotationLineItemId" TEXT,
    "stockItemId" TEXT,
    "workCategory" "RequisitionWorkCategory" NOT NULL DEFAULT 'CABINETS_CLOSETS',
    "materialName" TEXT NOT NULL,
    "specifications" TEXT,
    "variantAttributes" JSONB,
    "netQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "wastagePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'Pcs',
    "productionPhase" TEXT,
    "remarks" TEXT,

    CONSTRAINT "MaterialRequisitionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MaterialRequisition_requisitionNo_key" ON "MaterialRequisition"("requisitionNo");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MaterialRequisition_leadId_idx" ON "MaterialRequisition"("leadId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MaterialRequisition_quotationDraftId_idx" ON "MaterialRequisition"("quotationDraftId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MaterialRequisition_status_idx" ON "MaterialRequisition"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MaterialRequisitionItem_requisitionId_idx" ON "MaterialRequisitionItem"("requisitionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MaterialRequisitionItem_stockItemId_idx" ON "MaterialRequisitionItem"("stockItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MaterialRequisitionItem_workCategory_idx" ON "MaterialRequisitionItem"("workCategory");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MaterialRequisition" ADD CONSTRAINT "MaterialRequisition_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MaterialRequisition" ADD CONSTRAINT "MaterialRequisition_quotationDraftId_fkey" FOREIGN KEY ("quotationDraftId") REFERENCES "QuotationDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MaterialRequisition" ADD CONSTRAINT "MaterialRequisition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MaterialRequisitionItem" ADD CONSTRAINT "MaterialRequisitionItem_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "MaterialRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "MaterialRequisitionItem" ADD CONSTRAINT "MaterialRequisitionItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
