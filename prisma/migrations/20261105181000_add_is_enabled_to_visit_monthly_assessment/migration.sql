-- AlterTable
ALTER TABLE "VisitMemberMonthlyAssessment" ADD COLUMN IF NOT EXISTS "isEnabled" BOOLEAN NOT NULL DEFAULT true;
