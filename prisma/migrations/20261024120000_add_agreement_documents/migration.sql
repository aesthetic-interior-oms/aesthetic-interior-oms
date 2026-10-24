CREATE TABLE "AgreementDocument" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgreementDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgreementDocument_leadId_key" ON "AgreementDocument"("leadId");
CREATE INDEX "AgreementDocument_updatedById_idx" ON "AgreementDocument"("updatedById");
ALTER TABLE "AgreementDocument" ADD CONSTRAINT "AgreementDocument_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
