import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

// Dev/bootstrap seed only. Do not use plaintext env secrets in production.

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
  const existing = await prisma.user.findUnique({ where: { email } });
  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    select: { id: true, email: true },
  });

  if (existing) {
    if (existing.role === Role.ADMIN) {
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          ...(fullName ? { fullName } : {}),
        },
      });
      await prisma.$executeRaw`
        UPDATE "User"
        SET "suspendedAt" = NULL
        WHERE "id" = ${existing.id}
      `;
      console.log(`Admin ready: ${email}`);
      return;
    }

    if (existingAdmin && existingAdmin.id !== existing.id) {
      console.log(
        `Admin already exists (${existingAdmin.email}). Not promoting ${email}. Use transfer-admin flow instead.`
      );
      return;
    }

    await prisma.user.update({
      where: { email },
      data: {
        role: Role.ADMIN,
        passwordHash,
        ...(fullName ? { fullName } : {}),
      },
    });
    await prisma.$executeRaw`
      UPDATE "User"
      SET "suspendedAt" = NULL
      WHERE "email" = ${email}
    `;
    console.log(`Admin ready: ${email}`);
    return;
  }

  if (existingAdmin) {
    console.log(
      `Admin already exists (${existingAdmin.email}). Not creating second admin for ${email}.`
    );
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.ADMIN,
      ...(fullName ? { fullName } : {}),
    },
  });

  await prisma.$executeRaw`
    UPDATE "User"
    SET "suspendedAt" = NULL
    WHERE "email" = ${email}
  `;

  console.log(`Admin ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
