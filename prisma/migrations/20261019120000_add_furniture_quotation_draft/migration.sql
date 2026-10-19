CREATE TABLE "FurnitureQuotationDraft" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "content" JSONB NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "QuotationDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FurnitureQuotationDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FurnitureQuotationDraft_leadId_key" ON "FurnitureQuotationDraft"("leadId");
CREATE INDEX "FurnitureQuotationDraft_createdById_idx" ON "FurnitureQuotationDraft"("createdById");
CREATE INDEX "FurnitureQuotationDraft_status_idx" ON "FurnitureQuotationDraft"("status");

ALTER TABLE "FurnitureQuotationDraft" ADD CONSTRAINT "FurnitureQuotationDraft_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FurnitureQuotationDraft" ADD CONSTRAINT "FurnitureQuotationDraft_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FurnitureQuotationDraft" ADD CONSTRAINT "FurnitureQuotationDraft_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
