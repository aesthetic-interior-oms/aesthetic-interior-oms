-- Allow one lead to keep separate draft files for detail and each short package.
ALTER TABLE "QuotationDraft" ADD COLUMN "draftKey" TEXT;

UPDATE "QuotationDraft"
SET "draftKey" = CASE
  WHEN "content"->>'documentType' = 'short' THEN 'short:' || lower(COALESCE("content"->>'packageTier', "quotationType", 'PREMIUM'))
  ELSE 'detail'
END;

ALTER TABLE "QuotationDraft" ALTER COLUMN "draftKey" SET DEFAULT 'detail';
ALTER TABLE "QuotationDraft" ALTER COLUMN "draftKey" SET NOT NULL;

DROP INDEX "QuotationDraft_leadId_key";
CREATE UNIQUE INDEX "QuotationDraft_leadId_draftKey_key" ON "QuotationDraft"("leadId", "draftKey");
