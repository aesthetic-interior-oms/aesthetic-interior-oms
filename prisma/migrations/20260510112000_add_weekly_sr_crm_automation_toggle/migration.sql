-- Add a persisted toggle for the weekly Senior CRM auto-suggestion feature.
ALTER TABLE "VisitWorkflowControl"
  ADD COLUMN "weeklySeniorCrmAutomationEnabled" BOOLEAN NOT NULL DEFAULT true;
