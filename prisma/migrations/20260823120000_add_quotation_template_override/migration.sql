-- CreateTable
CREATE TABLE IF NOT EXISTS "QuotationTemplateOverride" (
    "id" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sectionId" TEXT,
    "description" TEXT,
    "materials" TEXT,
    "unit" TEXT,
    "priceMode" TEXT,
    "basicRate" DOUBLE PRECISION,
    "standardRate" DOUBLE PRECISION,
    "premiumRate" DOUBLE PRECISION,
    "rateMin" DOUBLE PRECISION,
    "rateMax" DOUBLE PRECISION,
    "isNewItem" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuotationTemplateOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuotationTemplateOverride_templateKey_idx" ON "QuotationTemplateOverride"("templateKey");

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "QuotationTemplateOverride_templateKey_itemId_key" ON "QuotationTemplateOverride"("templateKey", "itemId");
