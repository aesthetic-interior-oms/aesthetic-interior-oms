-- CreateTable
CREATE TABLE IF NOT EXISTS "VisitMemberMonthlyAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "attendanceScore" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "behaviourTag" TEXT,
    "behaviourScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitMemberMonthlyAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "VisitMemberMonthlyAssessment_userId_monthKey_key" ON "VisitMemberMonthlyAssessment"("userId", "monthKey");
CREATE INDEX IF NOT EXISTS "VisitMemberMonthlyAssessment_userId_idx" ON "VisitMemberMonthlyAssessment"("userId");
CREATE INDEX IF NOT EXISTS "VisitMemberMonthlyAssessment_monthKey_idx" ON "VisitMemberMonthlyAssessment"("monthKey");

-- AddForeignKey
ALTER TABLE "VisitMemberMonthlyAssessment" ADD CONSTRAINT "VisitMemberMonthlyAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
