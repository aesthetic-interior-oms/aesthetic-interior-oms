-- AlterTable User add web activity tracking columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastWebLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastWebActiveAt" TIMESTAMP(3);
