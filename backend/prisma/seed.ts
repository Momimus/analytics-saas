import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!email || !password) {
    console.log("ADMIN_BOOTSTRAP_EMAIL or ADMIN_BOOTSTRAP_PASSWORD not set. Skipping admin bootstrap.");
    return;
  }

  if (password.length < 6) {
    throw new Error("ADMIN_BOOTSTRAP_PASSWORD must be at least 6 characters.");
  }

  const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
  if (adminCount > 0) {
    console.log("Admin already exists. Skipping admin bootstrap.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { role: Role.ADMIN, passwordHash },
    });
    console.log("Existing user promoted to ADMIN.");
    return;
  }

  await prisma.user.create({
    data: { email, passwordHash, role: Role.ADMIN },
  });

  console.log("Admin user created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });