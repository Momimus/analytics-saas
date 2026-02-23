import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME?.trim() || null;

  if (!email || !password) {
    console.log("ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin bootstrap.");
    return;
  }

  if (password.length < 6) {
    throw new Error("ADMIN_PASSWORD must be at least 6 characters.");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const existingAdmin = await prisma.user.findFirst({
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  });

  if (existingAdmin && existingAdmin.email !== email) {
    console.log(`Admin already exists (${existingAdmin.email}). Skipping creation for ${email}.`);
    return;
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      ...(fullName ? { fullName } : {}),
      suspendedAt: null,
    },
    create: {
      email,
      passwordHash,
      ...(fullName ? { fullName } : {}),
    },
    select: { id: true, email: true },
  });

  console.log(`Admin ready: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
