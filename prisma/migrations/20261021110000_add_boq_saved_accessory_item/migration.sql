-- CreateTable
CREATE TABLE "BoqSavedAccessoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "itemCode" TEXT NOT NULL DEFAULT '',
    "defaultUnit" TEXT NOT NULL DEFAULT 'Pcs',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "serialNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoqSavedAccessoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoqSavedAccessoryItem_isActive_serialNo_idx" ON "BoqSavedAccessoryItem"("isActive", "serialNo");
