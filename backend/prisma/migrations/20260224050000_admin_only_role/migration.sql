ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
UPDATE "User" SET "role" = 'ADMIN';

CREATE TYPE "Role_new" AS ENUM ('ADMIN');
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role_new"
  USING ("role"::text::"Role_new");

ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
