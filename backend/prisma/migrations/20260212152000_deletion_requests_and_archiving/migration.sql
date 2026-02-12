-- CreateEnum
CREATE TYPE "DeletionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Course"
  ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DeletionRequest" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt" TIMESTAMP(3),
  "decidedById" TEXT,
  CONSTRAINT "DeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Course_archivedAt_idx" ON "Course"("archivedAt");
CREATE INDEX "DeletionRequest_courseId_idx" ON "DeletionRequest"("courseId");
CREATE INDEX "DeletionRequest_requestedById_idx" ON "DeletionRequest"("requestedById");
CREATE INDEX "DeletionRequest_status_idx" ON "DeletionRequest"("status");

-- AddForeignKey
ALTER TABLE "DeletionRequest"
  ADD CONSTRAINT "DeletionRequest_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeletionRequest"
  ADD CONSTRAINT "DeletionRequest_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeletionRequest"
  ADD CONSTRAINT "DeletionRequest_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
