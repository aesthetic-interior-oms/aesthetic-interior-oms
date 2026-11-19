CREATE TYPE "MaterialIndentStatus" AS ENUM ('ISSUED', 'CANCELLED');

ALTER TABLE "MaterialRequisition"
  ADD COLUMN "procurementAssigneeId" TEXT,
  ADD COLUMN "procurementAssignedAt" TIMESTAMP(3);

CREATE INDEX "MaterialRequisition_procurementAssigneeId_idx" ON "MaterialRequisition"("procurementAssigneeId");
ALTER TABLE "MaterialRequisition" ADD CONSTRAINT "MaterialRequisition_procurementAssigneeId_fkey"
  FOREIGN KEY ("procurementAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MaterialIndent" (
  "id" TEXT NOT NULL,
  "indentNo" TEXT NOT NULL,
  "requisitionId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "status" "MaterialIndentStatus" NOT NULL DEFAULT 'ISSUED',
  "vendorName" TEXT,
  "transportCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "otherCosts" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaterialIndent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MaterialIndent_indentNo_key" ON "MaterialIndent"("indentNo");
CREATE INDEX "MaterialIndent_requisitionId_createdAt_idx" ON "MaterialIndent"("requisitionId", "createdAt");
CREATE INDEX "MaterialIndent_leadId_idx" ON "MaterialIndent"("leadId");
ALTER TABLE "MaterialIndent" ADD CONSTRAINT "MaterialIndent_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "MaterialRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaterialIndent" ADD CONSTRAINT "MaterialIndent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaterialIndent" ADD CONSTRAINT "MaterialIndent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MaterialIndentItem" (
  "id" TEXT NOT NULL,
  "indentId" TEXT NOT NULL,
  "requisitionItemId" TEXT NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "unitPrice" DECIMAL(14,2) NOT NULL,
  "total" DECIMAL(14,2) NOT NULL,
  "vendorName" TEXT,
  "billedById" TEXT NOT NULL,
  "billedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MaterialIndentItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MaterialIndentItem_indentId_requisitionItemId_key" ON "MaterialIndentItem"("indentId", "requisitionItemId");
CREATE INDEX "MaterialIndentItem_requisitionItemId_idx" ON "MaterialIndentItem"("requisitionItemId");
ALTER TABLE "MaterialIndentItem" ADD CONSTRAINT "MaterialIndentItem_indentId_fkey" FOREIGN KEY ("indentId") REFERENCES "MaterialIndent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaterialIndentItem" ADD CONSTRAINT "MaterialIndentItem_requisitionItemId_fkey" FOREIGN KEY ("requisitionItemId") REFERENCES "MaterialRequisitionItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaterialIndentItem" ADD CONSTRAINT "MaterialIndentItem_billedById_fkey" FOREIGN KEY ("billedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
