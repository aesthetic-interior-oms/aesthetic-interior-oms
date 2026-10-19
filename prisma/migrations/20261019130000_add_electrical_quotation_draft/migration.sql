CREATE TABLE "ElectricalQuotationDraft" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "content" JSONB NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "QuotationDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ElectricalQuotationDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ElectricalQuotationDraft_leadId_key" ON "ElectricalQuotationDraft"("leadId");
CREATE INDEX "ElectricalQuotationDraft_createdById_idx" ON "ElectricalQuotationDraft"("createdById");
CREATE INDEX "ElectricalQuotationDraft_status_idx" ON "ElectricalQuotationDraft"("status");

ALTER TABLE "ElectricalQuotationDraft" ADD CONSTRAINT "ElectricalQuotationDraft_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ElectricalQuotationDraft" ADD CONSTRAINT "ElectricalQuotationDraft_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ElectricalQuotationDraft" ADD CONSTRAINT "ElectricalQuotationDraft_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
