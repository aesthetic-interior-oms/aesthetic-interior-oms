-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('UNDER_CONSTRUCTION', 'READY');

-- AlterTable
ALTER TABLE "Visit"
ADD COLUMN "projectSqft" DOUBLE PRECISION,
ADD COLUMN "projectStatus" "ProjectStatus";
