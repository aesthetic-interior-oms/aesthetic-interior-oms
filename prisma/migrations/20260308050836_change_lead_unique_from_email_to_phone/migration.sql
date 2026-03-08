/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - Made the column `phone` on table `Lead` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'FOLLOWUP_COMPLETED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'VISIT_SCHEDULED';

-- Pre-clean duplicate phone leads so unique index creation cannot fail.
-- Keep the oldest lead per phone and remap child records from duplicates.
WITH ranked AS (
  SELECT
    id,
    phone,
    ROW_NUMBER() OVER (
      PARTITION BY phone
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY phone
      ORDER BY created_at ASC, id ASC
    ) AS keep_id
  FROM "Lead"
  WHERE phone IS NOT NULL
),
dupes AS (
  SELECT id AS dup_id, keep_id
  FROM ranked
  WHERE rn > 1
)
DELETE FROM "LeadAssignment" la
USING dupes d, "LeadAssignment" existing
WHERE la."leadId" = d.dup_id
  AND existing."leadId" = d.keep_id
  AND existing."department" = la."department"
  AND existing."userId" = la."userId";

WITH ranked AS (
  SELECT
    id,
    phone,
    ROW_NUMBER() OVER (
      PARTITION BY phone
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY phone
      ORDER BY created_at ASC, id ASC
    ) AS keep_id
  FROM "Lead"
  WHERE phone IS NOT NULL
),
dupes AS (
  SELECT id AS dup_id, keep_id
  FROM ranked
  WHERE rn > 1
)
UPDATE "FollowUp" f
SET "leadId" = d.keep_id
FROM dupes d
WHERE f."leadId" = d.dup_id;

WITH ranked AS (
  SELECT
    id,
    phone,
    ROW_NUMBER() OVER (
      PARTITION BY phone
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY phone
      ORDER BY created_at ASC, id ASC
    ) AS keep_id
  FROM "Lead"
  WHERE phone IS NOT NULL
),
dupes AS (
  SELECT id AS dup_id, keep_id
  FROM ranked
  WHERE rn > 1
)
UPDATE "Note" n
SET "leadId" = d.keep_id
FROM dupes d
WHERE n."leadId" = d.dup_id;

WITH ranked AS (
  SELECT
    id,
    phone,
    ROW_NUMBER() OVER (
      PARTITION BY phone
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY phone
      ORDER BY created_at ASC, id ASC
    ) AS keep_id
  FROM "Lead"
  WHERE phone IS NOT NULL
),
dupes AS (
  SELECT id AS dup_id, keep_id
  FROM ranked
  WHERE rn > 1
)
UPDATE "ActivityLog" a
SET "leadId" = d.keep_id
FROM dupes d
WHERE a."leadId" = d.dup_id;

WITH ranked AS (
  SELECT
    id,
    phone,
    ROW_NUMBER() OVER (
      PARTITION BY phone
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY phone
      ORDER BY created_at ASC, id ASC
    ) AS keep_id
  FROM "Lead"
  WHERE phone IS NOT NULL
),
dupes AS (
  SELECT id AS dup_id, keep_id
  FROM ranked
  WHERE rn > 1
)
UPDATE "LeadStatusHistory" lsh
SET "leadId" = d.keep_id
FROM dupes d
WHERE lsh."leadId" = d.dup_id;

WITH ranked AS (
  SELECT
    id,
    phone,
    ROW_NUMBER() OVER (
      PARTITION BY phone
      ORDER BY created_at ASC, id ASC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY phone
      ORDER BY created_at ASC, id ASC
    ) AS keep_id
  FROM "Lead"
  WHERE phone IS NOT NULL
),
dupes AS (
  SELECT id AS dup_id, keep_id
  FROM ranked
  WHERE rn > 1
)
UPDATE "LeadAssignment" la
SET "leadId" = d.keep_id
FROM dupes d
WHERE la."leadId" = d.dup_id;

WITH ranked AS (
  SELECT
    id,
    phone,
    ROW_NUMBER() OVER (
      PARTITION BY phone
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM "Lead"
  WHERE phone IS NOT NULL
)
DELETE FROM "Lead" l
USING ranked r
WHERE l.id = r.id
  AND r.rn > 1;

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_phone_key" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");
