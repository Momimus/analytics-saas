-- Finalize Role enum for the analytics SaaS direction.
-- At this point prior migrations should already have converted any ADMIN users
-- to SUPER_ADMIN and set the default role to WORKSPACE_ADMIN.

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TYPE "Role" RENAME TO "Role_old";

CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'WORKSPACE_ADMIN', 'WORKSPACE_VIEWER');

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE TEXT
  USING ("role"::text);

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role"
  USING ("role"::"Role");

DROP TYPE "Role_old";

ALTER TABLE "User"
  ALTER COLUMN "role" SET DEFAULT 'WORKSPACE_ADMIN'::"Role";
