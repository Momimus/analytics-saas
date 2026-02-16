ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_single_admin_idx"
ON "User" ("role")
WHERE "role" = 'ADMIN';
