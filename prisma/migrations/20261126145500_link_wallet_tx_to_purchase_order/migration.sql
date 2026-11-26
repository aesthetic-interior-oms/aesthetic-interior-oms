-- AlterTable
ALTER TABLE "ProcurementWalletTransaction"
  ADD COLUMN "purchaseOrderId" TEXT,
  ADD COLUMN "supplierName" TEXT,
  ADD COLUMN "materialsSummary" JSONB;

-- CreateIndex
CREATE INDEX "ProcurementWalletTransaction_purchaseOrderId_idx" ON "ProcurementWalletTransaction"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "ProcurementWalletTransaction" ADD CONSTRAINT "ProcurementWalletTransaction_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
