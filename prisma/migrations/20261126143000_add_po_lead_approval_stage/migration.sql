-- AlterEnum
ALTER TYPE "PurchaseOrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_LEAD_APPROVAL' BEFORE 'PENDING_ACCOUNTS_APPROVAL';

-- AlterTable
ALTER TABLE "PurchaseOrder"
  ALTER COLUMN "status" SET DEFAULT 'PENDING_LEAD_APPROVAL',
  ADD COLUMN "leadVerifiedById" TEXT,
  ADD COLUMN "leadVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "leadVerificationNote" TEXT;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_leadVerifiedById_fkey" FOREIGN KEY ("leadVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
