-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "Enrollment"
  ADD COLUMN "status" "EnrollmentStatus" NOT NULL DEFAULT 'REQUESTED',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing enrollments so current students keep access
UPDATE "Enrollment" SET "status" = 'ACTIVE';

-- CreateIndex
CREATE INDEX "Enrollment_status_idx" ON "Enrollment"("status");
