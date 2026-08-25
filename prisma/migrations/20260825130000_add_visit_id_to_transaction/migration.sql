-- AlterTable: Add visitId and collectedById columns to Transaction
ALTER TABLE "Transaction" ADD COLUMN "visitId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "collectedById" TEXT;

-- CreateIndex
CREATE INDEX "Transaction_visitId_idx" ON "Transaction"("visitId");
CREATE INDEX "Transaction_collectedById_idx" ON "Transaction"("collectedById");

-- AddForeignKey for visitId
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for collectedById
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_collectedById_fkey"
  FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
