-- AlterTable
ALTER TABLE "CadWorkSubmission" ADD COLUMN IF NOT EXISTS "department" "LeadAssignmentDepartment" NOT NULL DEFAULT 'JR_ARCHITECT';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CadWorkSubmission_department_idx" ON "CadWorkSubmission"("department");

-- Backfill existing quotation submissions
UPDATE "CadWorkSubmission" SET "department" = 'QUOTATION'
WHERE "id" IN (
  SELECT c."id" FROM "CadWorkSubmission" c
  JOIN "User" u ON c."submittedById" = u."id"
  JOIN "UserDepartment" ud ON ud."userId" = u."id"
  JOIN "Department" d ON ud."departmentId" = d."id"
  WHERE d."name" IN ('QUOTATION', 'QUOTATION_TEAM')
  AND NOT EXISTS (
    SELECT 1 FROM "UserDepartment" ud2
    JOIN "Department" d2 ON ud2."departmentId" = d2."id"
    WHERE ud2."userId" = u."id" AND d2."name" = 'JR_ARCHITECT'
  )
);

-- Backfill existing visualizer submissions
UPDATE "CadWorkSubmission" SET "department" = 'VISUALIZER_3D'
WHERE "id" IN (
  SELECT c."id" FROM "CadWorkSubmission" c
  JOIN "User" u ON c."submittedById" = u."id"
  JOIN "UserDepartment" ud ON ud."userId" = u."id"
  JOIN "Department" d ON ud."departmentId" = d."id"
  WHERE d."name" = 'VISUALIZER_3D'
  AND NOT EXISTS (
    SELECT 1 FROM "UserDepartment" ud2
    JOIN "Department" d2 ON ud2."departmentId" = d2."id"
    WHERE ud2."userId" = u."id" AND d2."name" = 'JR_ARCHITECT'
  )
);
