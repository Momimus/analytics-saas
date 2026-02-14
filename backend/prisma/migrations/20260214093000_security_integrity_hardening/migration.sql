-- CreateTable
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Enrollment_courseId_status_idx" ON "Enrollment"("courseId", "status");
CREATE INDEX "DeletionRequest_courseId_status_idx" ON "DeletionRequest"("courseId", "status");
CREATE INDEX "Course_isPublished_archivedAt_idx" ON "Course"("isPublished", "archivedAt");

