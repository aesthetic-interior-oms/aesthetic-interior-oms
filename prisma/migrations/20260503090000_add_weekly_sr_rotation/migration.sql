ALTER TABLE "VisitWorkflowControl"
ADD COLUMN IF NOT EXISTS "weeklySeniorCrmUserId" TEXT,
ADD COLUMN IF NOT EXISTS "weeklySeniorCrmWeekStart" TIMESTAMP(3);
