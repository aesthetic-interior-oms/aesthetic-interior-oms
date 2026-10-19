CREATE TABLE "FurnitureQuotationSavedItem" (
    "id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'Nos',
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serialNo" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FurnitureQuotationSavedItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FurnitureQuotationSavedItem_section_isActive_serialNo_idx"
    ON "FurnitureQuotationSavedItem"("section", "isActive", "serialNo");
