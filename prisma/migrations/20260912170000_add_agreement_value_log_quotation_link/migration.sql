-- AlterTable: add quotationDraftId and versionTitle to AgreementValueLog
ALTER TABLE "AgreementValueLog" ADD COLUMN IF NOT EXISTS "quotationDraftId" TEXT;
ALTER TABLE "AgreementValueLog" ADD COLUMN IF NOT EXISTS "versionTitle" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AgreementValueLog_quotationDraftId_idx" ON "AgreementValueLog"("quotationDraftId");

-- AddForeignKey (safe idempotent)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AgreementValueLog_quotationDraftId_fkey'
    ) THEN
        ALTER TABLE "AgreementValueLog"
            ADD CONSTRAINT "AgreementValueLog_quotationDraftId_fkey"
            FOREIGN KEY ("quotationDraftId") REFERENCES "QuotationDraft"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
