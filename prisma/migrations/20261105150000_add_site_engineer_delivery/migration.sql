-- AlterEnum
ALTER TYPE "LeadAssignmentDepartment" ADD VALUE IF NOT EXISTS 'SITE_ENGINEER';

-- CreateEnum
CREATE TYPE "SiteDeliveryCondition" AS ENUM ('GOOD', 'PARTIAL', 'DAMAGED', 'REJECTED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "SiteDeliveryLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "challanNo" TEXT,
    "vendorName" TEXT,
    "itemsSummary" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "deliveryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "condition" "SiteDeliveryCondition" NOT NULL DEFAULT 'GOOD',
    "slipUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SiteDeliveryLog_leadId_idx" ON "SiteDeliveryLog"("leadId");
CREATE INDEX IF NOT EXISTS "SiteDeliveryLog_receivedById_idx" ON "SiteDeliveryLog"("receivedById");
CREATE INDEX IF NOT EXISTS "SiteDeliveryLog_deliveryDate_idx" ON "SiteDeliveryLog"("deliveryDate");

-- AddForeignKey
ALTER TABLE "SiteDeliveryLog" ADD CONSTRAINT "SiteDeliveryLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteDeliveryLog" ADD CONSTRAINT "SiteDeliveryLog_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
