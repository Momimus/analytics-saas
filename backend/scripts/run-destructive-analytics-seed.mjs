import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const command = isWindows ? "npx.cmd" : "npx";

const child = spawn(command, ["tsx", "prisma/seed.analytics.ts"], {
  stdio: "inherit",
  env: {
    ...process.env,
    ENABLE_DESTRUCTIVE_ANALYTICS_SEED: "true",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
