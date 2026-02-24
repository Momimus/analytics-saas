import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const emails = [...new Set([configuredEmail, "admin@gmail.com"].filter((value): value is string => Boolean(value)))];

  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        passwordHash: true,
      },
    });

    if (!user) {
      console.log(`[check-admin] ${email}: exists=false`);
      continue;
    }

    console.log(
      `[check-admin] ${email}: exists=true role=${user.role} hasPasswordHash=${Boolean(
        user.passwordHash?.trim()
      )} id=${user.id} fullName=${user.fullName ?? "null"}`
    );
  }
}

main()
  .catch((error) => {
    console.error("[check-admin] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

