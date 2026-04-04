-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VISIT_DUE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VISIT_REMINDER_30M';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'VISIT_ASSIGNED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "visitId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_visitId_idx" ON "Notification"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_visitId_type_key" ON "Notification"("userId", "visitId", "type");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
