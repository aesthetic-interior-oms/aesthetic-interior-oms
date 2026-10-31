-- AlterEnum
ALTER TYPE "RequisitionStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "RequisitionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PurchaseStockSource" AS ENUM ('FROM_STOCK', 'PURCHASED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PurchasePaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PurchaseDeliveryStatus" AS ENUM ('PENDING', 'PARTIALLY_DELIVERED', 'DELIVERED', 'RETURNED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PurchaseDocumentType" AS ENUM ('DELIVERY_NOTE', 'TAX_INVOICE', 'RECEIPT', 'REPLACEMENT_RECEIPT', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable MaterialRequisition
ALTER TABLE "MaterialRequisition" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "MaterialRequisition" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;

-- CreateTable PurchaseLine
CREATE TABLE IF NOT EXISTS "PurchaseLine" (
    "id" TEXT NOT NULL,
    "requisitionItemId" TEXT NOT NULL,
    "stockSource" "PurchaseStockSource" NOT NULL DEFAULT 'PURCHASED',
    "supplierName" TEXT,
    "supplierPhone" TEXT,
    "supplierEmail" TEXT,
    "quantityOrdered" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "quantityDelivered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quotedUnitPrice" DOUBLE PRECISION,
    "negotiatedUnitPrice" DOUBLE PRECISION,
    "materialTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transportCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loadingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherCosts" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPurchaseCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" "PurchasePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryStatus" "PurchaseDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "returnReason" TEXT,
    "replacementNote" TEXT,
    "dateOrdered" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable DeliveryBatch
CREATE TABLE IF NOT EXISTS "DeliveryBatch" (
    "id" TEXT NOT NULL,
    "purchaseLineId" TEXT NOT NULL,
    "quantityDelivered" DOUBLE PRECISION NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable DeliveryDateLog
CREATE TABLE IF NOT EXISTS "DeliveryDateLog" (
    "id" TEXT NOT NULL,
    "purchaseLineId" TEXT NOT NULL,
    "promisedDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "loggedById" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryDateLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable PurchaseDocument
CREATE TABLE IF NOT EXISTS "PurchaseDocument" (
    "id" TEXT NOT NULL,
    "purchaseLineId" TEXT NOT NULL,
    "documentType" "PurchaseDocumentType" NOT NULL DEFAULT 'RECEIPT',
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "uploadedById" TEXT,
    "notes" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable RequisitionAmendment
CREATE TABLE IF NOT EXISTS "RequisitionAmendment" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "changeDescription" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "acknowledgedById" TEXT,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "RequisitionAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PurchaseLine_requisitionItemId_idx" ON "PurchaseLine"("requisitionItemId");
CREATE INDEX IF NOT EXISTS "PurchaseLine_deliveryStatus_idx" ON "PurchaseLine"("deliveryStatus");
CREATE INDEX IF NOT EXISTS "PurchaseLine_paymentStatus_idx" ON "PurchaseLine"("paymentStatus");

CREATE INDEX IF NOT EXISTS "DeliveryBatch_purchaseLineId_idx" ON "DeliveryBatch"("purchaseLineId");

CREATE INDEX IF NOT EXISTS "DeliveryDateLog_purchaseLineId_idx" ON "DeliveryDateLog"("purchaseLineId");

CREATE INDEX IF NOT EXISTS "PurchaseDocument_purchaseLineId_idx" ON "PurchaseDocument"("purchaseLineId");

CREATE INDEX IF NOT EXISTS "RequisitionAmendment_requisitionId_idx" ON "RequisitionAmendment"("requisitionId");
CREATE INDEX IF NOT EXISTS "RequisitionAmendment_status_idx" ON "RequisitionAmendment"("status");

-- AddForeignKey PurchaseLine -> MaterialRequisitionItem
DO $$ BEGIN
  ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_requisitionItemId_fkey"
    FOREIGN KEY ("requisitionItemId") REFERENCES "MaterialRequisitionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey PurchaseLine -> User (createdById)
DO $$ BEGIN
  ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey PurchaseLine -> User (updatedById)
DO $$ BEGIN
  ALTER TABLE "PurchaseLine" ADD CONSTRAINT "PurchaseLine_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey DeliveryBatch -> PurchaseLine
DO $$ BEGIN
  ALTER TABLE "DeliveryBatch" ADD CONSTRAINT "DeliveryBatch_purchaseLineId_fkey"
    FOREIGN KEY ("purchaseLineId") REFERENCES "PurchaseLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey DeliveryBatch -> User (receivedById)
DO $$ BEGIN
  ALTER TABLE "DeliveryBatch" ADD CONSTRAINT "DeliveryBatch_receivedById_fkey"
    FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey DeliveryDateLog -> PurchaseLine
DO $$ BEGIN
  ALTER TABLE "DeliveryDateLog" ADD CONSTRAINT "DeliveryDateLog_purchaseLineId_fkey"
    FOREIGN KEY ("purchaseLineId") REFERENCES "PurchaseLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey DeliveryDateLog -> User (loggedById)
DO $$ BEGIN
  ALTER TABLE "DeliveryDateLog" ADD CONSTRAINT "DeliveryDateLog_loggedById_fkey"
    FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey PurchaseDocument -> PurchaseLine
DO $$ BEGIN
  ALTER TABLE "PurchaseDocument" ADD CONSTRAINT "PurchaseDocument_purchaseLineId_fkey"
    FOREIGN KEY ("purchaseLineId") REFERENCES "PurchaseLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey PurchaseDocument -> User (uploadedById)
DO $$ BEGIN
  ALTER TABLE "PurchaseDocument" ADD CONSTRAINT "PurchaseDocument_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey RequisitionAmendment -> MaterialRequisition
DO $$ BEGIN
  ALTER TABLE "RequisitionAmendment" ADD CONSTRAINT "RequisitionAmendment_requisitionId_fkey"
    FOREIGN KEY ("requisitionId") REFERENCES "MaterialRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey RequisitionAmendment -> User (requestedById)
DO $$ BEGIN
  ALTER TABLE "RequisitionAmendment" ADD CONSTRAINT "RequisitionAmendment_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey RequisitionAmendment -> User (acknowledgedById)
DO $$ BEGIN
  ALTER TABLE "RequisitionAmendment" ADD CONSTRAINT "RequisitionAmendment_acknowledgedById_fkey"
    FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
