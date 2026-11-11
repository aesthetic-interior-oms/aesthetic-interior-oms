-- AlterTable
ALTER TABLE "BoqSavedAccessoryItem" ADD COLUMN "brand" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "BoqSavedApplianceItem" ADD COLUMN "brand" TEXT NOT NULL DEFAULT '';
ALTER TABLE "BoqSavedApplianceItem" ADD COLUMN "modelCode" TEXT NOT NULL DEFAULT '';
