-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SIGNUP_PENDING_APPROVAL';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SIGNUP_APPROVED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "User" ADD COLUMN "approvedAt" TIMESTAMP(3);

ALTER TABLE "Notification" ADD COLUMN "subjectUserId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_subjectUserId_idx" ON "Notification"("subjectUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_subjectUserId_type_key" ON "Notification"("userId", "subjectUserId", "type");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
