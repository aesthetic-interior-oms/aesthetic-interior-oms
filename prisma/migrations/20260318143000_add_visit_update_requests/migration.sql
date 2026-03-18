-- CreateEnum
CREATE TYPE "VisitUpdateRequestType" AS ENUM ('RESCHEDULE', 'CANCEL');

-- CreateEnum
CREATE TYPE "VisitUpdateRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "VisitUpdateRequest" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "type" "VisitUpdateRequestType" NOT NULL,
    "status" "VisitUpdateRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "requestedScheduleAt" TIMESTAMP(3),
    "requestedById" TEXT NOT NULL,
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "VisitUpdateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitUpdateRequest_visitId_idx" ON "VisitUpdateRequest"("visitId");

-- CreateIndex
CREATE INDEX "VisitUpdateRequest_status_idx" ON "VisitUpdateRequest"("status");

-- CreateIndex
CREATE INDEX "VisitUpdateRequest_requestedById_idx" ON "VisitUpdateRequest"("requestedById");

-- CreateIndex
CREATE INDEX "VisitUpdateRequest_resolvedById_idx" ON "VisitUpdateRequest"("resolvedById");

-- AddForeignKey
ALTER TABLE "VisitUpdateRequest" ADD CONSTRAINT "VisitUpdateRequest_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitUpdateRequest" ADD CONSTRAINT "VisitUpdateRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitUpdateRequest" ADD CONSTRAINT "VisitUpdateRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
