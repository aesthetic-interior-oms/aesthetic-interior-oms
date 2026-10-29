-- AlterTable
ALTER TABLE "CadWorkSubmission" ADD COLUMN IF NOT EXISTS "versionNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "CadWorkSubmission" ADD COLUMN IF NOT EXISTS "versionName" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "JrArchitectWorkflowControl" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "completeResubmissionEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JrArchitectWorkflowControl_pkey" PRIMARY KEY ("id")
);
