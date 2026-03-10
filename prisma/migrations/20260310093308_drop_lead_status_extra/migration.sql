/*
  Warnings:

  - You are about to drop the column `status` on the `Lead` table. All the data in the column will be lost.
  - Changed the type of `oldStatus` on the `LeadStatusHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `newStatus` on the `LeadStatusHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "LeadStatusHistory" DROP COLUMN "oldStatus",
ADD COLUMN     "oldStatus" "LeadStage" NOT NULL,
DROP COLUMN "newStatus",
ADD COLUMN     "newStatus" "LeadStage" NOT NULL;

-- DropEnum
DROP TYPE "LeadStatus";
