-- CreateEnum
CREATE TYPE "QuotationDraftStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateTable
CREATE TABLE "QuotationDraft" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "quotationType" TEXT NOT NULL DEFAULT 'STANDARD',
    "projectSqft" DOUBLE PRECISION,
    "content" JSONB NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "QuotationDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuotationDraft_leadId_key" ON "QuotationDraft"("leadId");

-- CreateIndex
CREATE INDEX "QuotationDraft_createdById_idx" ON "QuotationDraft"("createdById");

-- CreateIndex
CREATE INDEX "QuotationDraft_status_idx" ON "QuotationDraft"("status");

-- AddForeignKey
ALTER TABLE "QuotationDraft" ADD CONSTRAINT "QuotationDraft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationDraft" ADD CONSTRAINT "QuotationDraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationDraft" ADD CONSTRAINT "QuotationDraft_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
