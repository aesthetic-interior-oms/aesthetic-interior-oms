-- CreateEnum
CREATE TYPE "ProcurementWalletTxType" AS ENUM ('DISBURSEMENT', 'EXPENSE', 'REIMBURSEMENT', 'RETURN_TO_ACCOUNTS');

-- CreateEnum
CREATE TYPE "ProcurementPaidFrom" AS ENUM ('COMPANY_ADVANCE', 'PERSONAL_POCKET');

-- CreateEnum
CREATE TYPE "ProcurementTxStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SETTLED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProcurementWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "advanceBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingReimbursement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProcurementWalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "ProcurementWalletTxType" NOT NULL,
    "status" "ProcurementTxStatus" NOT NULL DEFAULT 'PENDING',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL,
    "charge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paidFrom" "ProcurementPaidFrom" NOT NULL DEFAULT 'COMPANY_ADVANCE',
    "category" TEXT NOT NULL,
    "particular" TEXT NOT NULL,
    "voucherNo" TEXT,
    "receiptUrl" TEXT,
    "leadId" TEXT,
    "materialRequisitionId" TEXT,
    "financeAccountId" TEXT,
    "financeTransactionId" TEXT,
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "accountsNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementWalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProcurementWallet_userId_key" ON "ProcurementWallet"("userId");
CREATE INDEX IF NOT EXISTS "ProcurementWallet_userId_idx" ON "ProcurementWallet"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProcurementWalletTransaction_walletId_idx" ON "ProcurementWalletTransaction"("walletId");
CREATE INDEX IF NOT EXISTS "ProcurementWalletTransaction_type_idx" ON "ProcurementWalletTransaction"("type");
CREATE INDEX IF NOT EXISTS "ProcurementWalletTransaction_status_idx" ON "ProcurementWalletTransaction"("status");
CREATE INDEX IF NOT EXISTS "ProcurementWalletTransaction_date_idx" ON "ProcurementWalletTransaction"("date");
CREATE INDEX IF NOT EXISTS "ProcurementWalletTransaction_leadId_idx" ON "ProcurementWalletTransaction"("leadId");
CREATE INDEX IF NOT EXISTS "ProcurementWalletTransaction_financeAccountId_idx" ON "ProcurementWalletTransaction"("financeAccountId");
CREATE INDEX IF NOT EXISTS "ProcurementWalletTransaction_materialRequisitionId_idx" ON "ProcurementWalletTransaction"("materialRequisitionId");

-- AddForeignKey
ALTER TABLE "ProcurementWallet" ADD CONSTRAINT "ProcurementWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementWalletTransaction" ADD CONSTRAINT "ProcurementWalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "ProcurementWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementWalletTransaction" ADD CONSTRAINT "ProcurementWalletTransaction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementWalletTransaction" ADD CONSTRAINT "ProcurementWalletTransaction_materialRequisitionId_fkey" FOREIGN KEY ("materialRequisitionId") REFERENCES "MaterialRequisition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementWalletTransaction" ADD CONSTRAINT "ProcurementWalletTransaction_financeAccountId_fkey" FOREIGN KEY ("financeAccountId") REFERENCES "FinanceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementWalletTransaction" ADD CONSTRAINT "ProcurementWalletTransaction_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementWalletTransaction" ADD CONSTRAINT "ProcurementWalletTransaction_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
