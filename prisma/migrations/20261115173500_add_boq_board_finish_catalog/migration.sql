-- CreateEnum
CREATE TYPE "BoqMaterialType" AS ENUM ('BOARD', 'PRELAMINATED', 'HPL', 'DOCU');

-- CreateTable
CREATE TABLE "BoqBoardFinishItem" (
    "id" TEXT NOT NULL,
    "type" "BoqMaterialType" NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL DEFAULT '',
    "thickness" TEXT NOT NULL DEFAULT '',
    "sheetSize" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "serialNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoqBoardFinishItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoqBoardFinishItem_type_isActive_serialNo_idx" ON "BoqBoardFinishItem"("type", "isActive", "serialNo");
