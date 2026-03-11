-- Multi-tenant workspace baseline

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'WORKSPACE_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'WORKSPACE_VIEWER';

CREATE TYPE "WorkspaceMemberRole" AS ENUM ('WORKSPACE_ADMIN', 'WORKSPACE_VIEWER');

CREATE TABLE "Workspace" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

CREATE TABLE "WorkspaceMember" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "WorkspaceMemberRole" NOT NULL DEFAULT 'WORKSPACE_VIEWER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

ALTER TABLE "Product" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Order" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "AnalyticsEvent" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "workspaceId" TEXT;

DO $$
DECLARE
  default_workspace_id TEXT := 'ws_default_admin';
  owner_user_id TEXT;
BEGIN
  SELECT "id" INTO owner_user_id
  FROM "User"
  ORDER BY "createdAt" ASC
  LIMIT 1;

  IF owner_user_id IS NULL THEN
    owner_user_id := 'bootstrap_admin_user';
    INSERT INTO "User" ("id", "email", "passwordHash", "role", "createdAt", "updatedAt")
    VALUES (owner_user_id, 'bootstrap@local.invalid', 'bootstrap', 'ADMIN'::"Role", NOW(), NOW());
  END IF;

  INSERT INTO "Workspace" ("id", "name", "slug", "createdByUserId", "createdAt", "updatedAt")
  VALUES (default_workspace_id, 'Admin Workspace', 'admin-workspace', owner_user_id, NOW(), NOW());

  INSERT INTO "WorkspaceMember" ("id", "workspaceId", "userId", "role", "createdAt")
  SELECT CONCAT('wsm_', u."id"), default_workspace_id, u."id",
    CASE
      WHEN u."role"::text IN ('ADMIN', 'SUPER_ADMIN', 'WORKSPACE_ADMIN') THEN 'WORKSPACE_ADMIN'::"WorkspaceMemberRole"
      ELSE 'WORKSPACE_VIEWER'::"WorkspaceMemberRole"
    END,
    NOW()
  FROM "User" u;

  UPDATE "Product" SET "workspaceId" = default_workspace_id WHERE "workspaceId" IS NULL;

  UPDATE "Order" o
  SET "workspaceId" = COALESCE(p."workspaceId", default_workspace_id)
  FROM "Product" p
  WHERE o."productId" = p."id" AND o."workspaceId" IS NULL;

  UPDATE "Order" SET "workspaceId" = default_workspace_id WHERE "workspaceId" IS NULL;

  UPDATE "AnalyticsEvent" ae
  SET "workspaceId" = o."workspaceId"
  FROM "Order" o
  WHERE ae."orderId" = o."id" AND ae."workspaceId" IS NULL;

  UPDATE "AnalyticsEvent" ae
  SET "workspaceId" = COALESCE(p."workspaceId", default_workspace_id)
  FROM "Product" p
  WHERE ae."productId" = p."id" AND ae."workspaceId" IS NULL;

  UPDATE "AnalyticsEvent" SET "workspaceId" = default_workspace_id WHERE "workspaceId" IS NULL;

  UPDATE "AuditLog" SET "workspaceId" = default_workspace_id WHERE "workspaceId" IS NULL;
END $$;

ALTER TABLE "Product" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "AnalyticsEvent" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "workspaceId" SET NOT NULL;

ALTER TABLE "Workspace"
  ADD CONSTRAINT "Workspace_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMember"
  ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMember"
  ADD CONSTRAINT "WorkspaceMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AnalyticsEvent"
  ADD CONSTRAINT "AnalyticsEvent_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Product_workspaceId_createdAt_id_idx" ON "Product"("workspaceId", "createdAt", "id");
CREATE INDEX "Order_workspaceId_createdAt_id_idx" ON "Order"("workspaceId", "createdAt", "id");
CREATE INDEX "AnalyticsEvent_workspaceId_createdAt_id_idx" ON "AnalyticsEvent"("workspaceId", "createdAt", "id");
CREATE INDEX "AnalyticsEvent_workspaceId_eventName_createdAt_idx" ON "AnalyticsEvent"("workspaceId", "eventName", "createdAt");
CREATE INDEX "AuditLog_workspaceId_createdAt_id_idx" ON "AuditLog"("workspaceId", "createdAt", "id");
