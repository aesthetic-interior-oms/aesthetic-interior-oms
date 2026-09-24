DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'LeadStage' AND e.enumlabel = 'PARTIAL_QUOTATION_PHASE'
  ) THEN
    ALTER TYPE "LeadStage" ADD VALUE 'PARTIAL_QUOTATION_PHASE';
  END IF;
END $$;

CREATE TABLE "PartialQuotationDraft" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "content" JSONB NOT NULL,
  "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" "QuotationDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartialQuotationDraft_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PartialQuotationDraft_leadId_key" ON "PartialQuotationDraft"("leadId");
CREATE INDEX "PartialQuotationDraft_createdById_idx" ON "PartialQuotationDraft"("createdById");
CREATE INDEX "PartialQuotationDraft_status_idx" ON "PartialQuotationDraft"("status");
ALTER TABLE "PartialQuotationDraft" ADD CONSTRAINT "PartialQuotationDraft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartialQuotationDraft" ADD CONSTRAINT "PartialQuotationDraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartialQuotationDraft" ADD CONSTRAINT "PartialQuotationDraft_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
