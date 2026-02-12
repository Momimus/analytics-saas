import "dotenv/config";
import { Role } from "@prisma/client";
import prisma from "../src/lib/prisma.js";

async function main() {
  const email = process.argv[2];
  const requestedRole = (process.argv[3] ?? "INSTRUCTOR").toUpperCase();

  if (!email) {
    console.error("Usage: npm run make:role -- <email> [INSTRUCTOR|ADMIN]");
    process.exit(1);
  }

  if (requestedRole !== "INSTRUCTOR" && requestedRole !== "ADMIN") {
    console.error("Role must be INSTRUCTOR or ADMIN");
    process.exit(1);
  }

  const role = requestedRole === "ADMIN" ? Role.ADMIN : Role.INSTRUCTOR;

  const user = await prisma.user.update({
    where: { email },
    data: { role },
    select: { id: true, email: true, role: true },
  });

  console.log(`Updated user role: ${user.email} -> ${user.role}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
