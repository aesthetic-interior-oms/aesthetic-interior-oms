CREATE TABLE "WebsiteProject" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "ownerName" TEXT,
  "type" TEXT,
  "sqft" TEXT,
  "duration" TEXT,
  "category" TEXT NOT NULL DEFAULT 'residential',
  "location" TEXT,
  "thumbnailUrl" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "details" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsiteProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebsiteProjectImage" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "alt" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteProjectImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebsiteProject_slug_key" ON "WebsiteProject"("slug");
CREATE INDEX "WebsiteProject_isPublished_sortOrder_idx" ON "WebsiteProject"("isPublished", "sortOrder");
CREATE INDEX "WebsiteProject_category_idx" ON "WebsiteProject"("category");
CREATE INDEX "WebsiteProjectImage_projectId_sortOrder_idx" ON "WebsiteProjectImage"("projectId", "sortOrder");

ALTER TABLE "WebsiteProjectImage" ADD CONSTRAINT "WebsiteProjectImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WebsiteProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
