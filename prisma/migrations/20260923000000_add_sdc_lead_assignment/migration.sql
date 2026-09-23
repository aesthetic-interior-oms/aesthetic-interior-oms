ALTER TYPE "LeadAssignmentDepartment" ADD VALUE IF NOT EXISTS 'SPECIALIST_DESIGN_CONSULTANTS';

-- Preserve the ownership distinction for existing partial visits. A Visit Team
-- assignment is converted only when that person has no normal visit on the lead.
UPDATE "LeadAssignment" AS assignment
SET "department" = 'SPECIALIST_DESIGN_CONSULTANTS'
WHERE assignment."department" = 'VISIT_TEAM'
  AND EXISTS (
    SELECT 1 FROM "Visit"
    WHERE "Visit"."leadId" = assignment."leadId"
      AND "Visit"."assignedToId" = assignment."userId"
      AND "Visit"."visitType" = 'PARTIAL_WORK_VISIT'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "Visit"
    WHERE "Visit"."leadId" = assignment."leadId"
      AND "Visit"."assignedToId" = assignment."userId"
      AND "Visit"."visitType" <> 'PARTIAL_WORK_VISIT'
  );
