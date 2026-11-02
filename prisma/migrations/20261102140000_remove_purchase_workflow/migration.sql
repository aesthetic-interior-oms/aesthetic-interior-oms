-- DropForeignKey
ALTER TABLE "PurchaseLine" DROP CONSTRAINT IF EXISTS "PurchaseLine_requisitionItemId_fkey";
ALTER TABLE "PurchaseLine" DROP CONSTRAINT IF EXISTS "PurchaseLine_createdById_fkey";
ALTER TABLE "PurchaseLine" DROP CONSTRAINT IF EXISTS "PurchaseLine_updatedById_fkey";

ALTER TABLE "DeliveryBatch" DROP CONSTRAINT IF EXISTS "DeliveryBatch_purchaseLineId_fkey";
ALTER TABLE "DeliveryBatch" DROP CONSTRAINT IF EXISTS "DeliveryBatch_receivedById_fkey";

ALTER TABLE "DeliveryDateLog" DROP CONSTRAINT IF EXISTS "DeliveryDateLog_purchaseLineId_fkey";
ALTER TABLE "DeliveryDateLog" DROP CONSTRAINT IF EXISTS "DeliveryDateLog_loggedById_fkey";

ALTER TABLE "PurchaseDocument" DROP CONSTRAINT IF EXISTS "PurchaseDocument_purchaseLineId_fkey";
ALTER TABLE "PurchaseDocument" DROP CONSTRAINT IF EXISTS "PurchaseDocument_uploadedById_fkey";

-- DropTable
DROP TABLE IF EXISTS "PurchaseDocument";
DROP TABLE IF EXISTS "DeliveryBatch";
DROP TABLE IF EXISTS "DeliveryDateLog";
DROP TABLE IF EXISTS "PurchaseLine";

-- DropEnum
DROP TYPE IF EXISTS "PurchaseStockSource";
DROP TYPE IF EXISTS "PurchasePaymentStatus";
DROP TYPE IF EXISTS "PurchaseDeliveryStatus";
DROP TYPE IF EXISTS "PurchaseDocumentType";
