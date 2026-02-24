import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() || "admin@gmail.com";
  const password = process.env.ADMIN_PASSWORD?.trim() || "admin123456";
  const fullName = process.env.ADMIN_NAME?.trim() || "Admin";

  if (password.length < 6) {
    throw new Error("ADMIN_PASSWORD must be at least 6 characters.");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      passwordHash,
      fullName,
      suspendedAt: null,
    },
    create: {
      email,
      role: "ADMIN",
      passwordHash,
      fullName,
    },
    select: { id: true, email: true },
  });

  const cleanup = await prisma.user.deleteMany({
    where: {
      id: { not: admin.id },
    },
  });

  const finalCount = await prisma.user.count();
  console.log(`Admin ready: ${admin.email}`);
  console.log(`Removed ${cleanup.count} non-target users. Current user count: ${finalCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
