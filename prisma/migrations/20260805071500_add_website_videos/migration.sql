CREATE TABLE "WebsiteVideo" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'youtube',
  "videoId" TEXT,
  "embedUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "duration" TEXT,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteVideo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteVideo_isPublished_isFeatured_sortOrder_idx" ON "WebsiteVideo"("isPublished", "isFeatured", "sortOrder");
