-- CreateEnum
CREATE TYPE "SiteItemCompletionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "SiteItemCompletionRequest" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "status" "SiteItemCompletionRequestStatus" NOT NULL DEFAULT 'PENDING',
  "lineIds" TEXT[],
  "itemsSnapshot" JSONB NOT NULL,
  "note" TEXT,
  "rejectionReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteItemCompletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteItemCompletionRequest_leadId_idx" ON "SiteItemCompletionRequest"("leadId");
CREATE INDEX "SiteItemCompletionRequest_draftId_idx" ON "SiteItemCompletionRequest"("draftId");
CREATE INDEX "SiteItemCompletionRequest_requestedById_idx" ON "SiteItemCompletionRequest"("requestedById");
CREATE INDEX "SiteItemCompletionRequest_status_idx" ON "SiteItemCompletionRequest"("status");
CREATE INDEX "SiteItemCompletionRequest_createdAt_idx" ON "SiteItemCompletionRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "SiteItemCompletionRequest" ADD CONSTRAINT "SiteItemCompletionRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteItemCompletionRequest" ADD CONSTRAINT "SiteItemCompletionRequest_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "QuotationDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteItemCompletionRequest" ADD CONSTRAINT "SiteItemCompletionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteItemCompletionRequest" ADD CONSTRAINT "SiteItemCompletionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
