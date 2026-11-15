-- AlterTable User add mobile tracking columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastMobileLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastMobileActiveAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mobilePlatform" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mobileAppVersion" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mobileDeviceModel" TEXT;
