-- CreateTable
CREATE TABLE "QuotationUserPerformance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "detailSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shortSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "avgWorkingHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationUserPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuotationUserPerformance_userId_idx" ON "QuotationUserPerformance"("userId");

-- CreateIndex
CREATE INDEX "QuotationUserPerformance_monthKey_idx" ON "QuotationUserPerformance"("monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "QuotationUserPerformance_userId_monthKey_key" ON "QuotationUserPerformance"("userId", "monthKey");

-- AddForeignKey
ALTER TABLE "QuotationUserPerformance" ADD CONSTRAINT "QuotationUserPerformance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
