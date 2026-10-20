CREATE TABLE "ConveyanceRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "purpose" TEXT NOT NULL,
  "travelDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "voucherNo" TEXT,
  "approvedAmount" DOUBLE PRECISION,
  "accountsNote" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConveyanceRequest_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ConveyanceRequest" ADD CONSTRAINT "ConveyanceRequest_amount_check" CHECK ("amount" > 0);
ALTER TABLE "ConveyanceRequest" ADD CONSTRAINT "ConveyanceRequest_approvedAmount_check" CHECK ("approvedAmount" IS NULL OR ("approvedAmount" >= 0 AND "approvedAmount" <= "amount"));
ALTER TABLE "ConveyanceRequest" ADD CONSTRAINT "ConveyanceRequest_status_check" CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID'));
CREATE UNIQUE INDEX "ConveyanceRequest_voucherNo_key" ON "ConveyanceRequest"("voucherNo");
CREATE INDEX "ConveyanceRequest_travelDate_idx" ON "ConveyanceRequest"("travelDate");
CREATE INDEX "ConveyanceRequest_requesterId_travelDate_idx" ON "ConveyanceRequest"("requesterId", "travelDate");
CREATE INDEX "ConveyanceRequest_status_travelDate_idx" ON "ConveyanceRequest"("status", "travelDate");
ALTER TABLE "ConveyanceRequest" ADD CONSTRAINT "ConveyanceRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConveyanceRequest" ADD CONSTRAINT "ConveyanceRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
