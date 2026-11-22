-- CreateEnum
CREATE TYPE "LeadSiteWorkRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "isSiteWorkActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "siteWorkStartedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LeadSiteWorkRequest" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "status" "LeadSiteWorkRequestStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "rejectionReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadSiteWorkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadSiteWorkRequest_leadId_idx" ON "LeadSiteWorkRequest"("leadId");
CREATE INDEX "LeadSiteWorkRequest_requestedById_idx" ON "LeadSiteWorkRequest"("requestedById");
CREATE INDEX "LeadSiteWorkRequest_status_idx" ON "LeadSiteWorkRequest"("status");
CREATE INDEX "LeadSiteWorkRequest_createdAt_idx" ON "LeadSiteWorkRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "LeadSiteWorkRequest" ADD CONSTRAINT "LeadSiteWorkRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadSiteWorkRequest" ADD CONSTRAINT "LeadSiteWorkRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadSiteWorkRequest" ADD CONSTRAINT "LeadSiteWorkRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
