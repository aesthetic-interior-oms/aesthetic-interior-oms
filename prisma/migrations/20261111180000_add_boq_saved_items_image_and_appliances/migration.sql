-- AlterTable
ALTER TABLE "BoqSavedAccessoryItem" ADD COLUMN "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "BoqSavedApplianceItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "brandModelCode" TEXT NOT NULL DEFAULT '',
    "dimW" TEXT NOT NULL DEFAULT '',
    "dimD" TEXT NOT NULL DEFAULT '',
    "dimH" TEXT NOT NULL DEFAULT '',
    "cabinetNicheCutOutSize" TEXT NOT NULL DEFAULT '',
    "defaultUnitPrice" TEXT NOT NULL DEFAULT '',
    "defaultUnit" TEXT NOT NULL DEFAULT 'Nos',
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "serialNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoqSavedApplianceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoqSavedApplianceItem_isActive_serialNo_idx" ON "BoqSavedApplianceItem"("isActive", "serialNo");
