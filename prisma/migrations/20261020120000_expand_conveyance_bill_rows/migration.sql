ALTER TABLE "ConveyanceRequest"
  ADD COLUMN "clientName" TEXT NOT NULL DEFAULT 'Legacy request',
  ADD COLUMN "clientLocation" TEXT NOT NULL DEFAULT 'Not recorded';

CREATE TABLE "ConveyanceBill" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "from" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConveyanceBill_pkey" PRIMARY KEY ("id")
);

-- Preserve each existing single-line request as one bill row before removing the old fields.
INSERT INTO "ConveyanceBill" ("id", "requestId", "date", "from", "to", "mode", "purpose", "amount", "createdAt")
SELECT 'legacy_' || "id", "id", "travelDate", 'Not recorded', 'Not recorded', 'OTHER', "purpose", "amount", "createdAt"
FROM "ConveyanceRequest";

ALTER TABLE "ConveyanceBill" ADD CONSTRAINT "ConveyanceBill_amount_check" CHECK ("amount" > 0);
ALTER TABLE "ConveyanceBill" ADD CONSTRAINT "ConveyanceBill_mode_check" CHECK ("mode" IN ('WALKING', 'RICKSHAW', 'CNG', 'BUS', 'TRAIN', 'RIDE_SHARE', 'TAXI', 'CAR', 'MOTORCYCLE', 'LAUNCH', 'FERRY', 'OTHER'));
CREATE INDEX "ConveyanceBill_requestId_date_idx" ON "ConveyanceBill"("requestId", "date");
CREATE INDEX "ConveyanceBill_date_idx" ON "ConveyanceBill"("date");
ALTER TABLE "ConveyanceBill" ADD CONSTRAINT "ConveyanceBill_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ConveyanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX "ConveyanceRequest_travelDate_idx";
DROP INDEX "ConveyanceRequest_requesterId_travelDate_idx";
DROP INDEX "ConveyanceRequest_status_travelDate_idx";
ALTER TABLE "ConveyanceRequest" DROP COLUMN "travelDate", DROP COLUMN "purpose";
ALTER TABLE "ConveyanceRequest" ALTER COLUMN "clientName" DROP DEFAULT;
ALTER TABLE "ConveyanceRequest" ALTER COLUMN "clientLocation" DROP DEFAULT;
CREATE INDEX "ConveyanceRequest_requesterId_createdAt_idx" ON "ConveyanceRequest"("requesterId", "createdAt");
CREATE INDEX "ConveyanceRequest_status_createdAt_idx" ON "ConveyanceRequest"("status", "createdAt");
