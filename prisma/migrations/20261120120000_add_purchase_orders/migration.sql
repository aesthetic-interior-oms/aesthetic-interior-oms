-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('PENDING_ACCOUNTS_APPROVAL', 'APPROVED', 'REJECTED', 'FULFILLED');

-- CreateTable
CREATE TABLE "PurchaseOrder" (
  "id" TEXT NOT NULL,
  "poNo" TEXT NOT NULL,
  "indentId" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'PENDING_ACCOUNTS_APPROVAL',
  "totalAmount" FLOAT8 NOT NULL,
  "supplierName" TEXT,
  "notes" TEXT,
  "accountsNote" TEXT,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedById" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNo_key" ON "PurchaseOrder"("poNo");
CREATE UNIQUE INDEX "PurchaseOrder_indentId_key" ON "PurchaseOrder"("indentId");
CREATE INDEX "PurchaseOrder_leadId_idx" ON "PurchaseOrder"("leadId");
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");
CREATE INDEX "PurchaseOrder_createdById_idx" ON "PurchaseOrder"("createdById");

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_indentId_fkey" FOREIGN KEY ("indentId") REFERENCES "MaterialIndent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
