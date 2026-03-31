-- AlterTable
ALTER TABLE "FacebookSyncControl"
ADD COLUMN "incrementalCursor" TEXT,
ADD COLUMN "incrementalWatermark" TIMESTAMP(3);
