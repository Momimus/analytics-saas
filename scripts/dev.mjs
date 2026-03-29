import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

const processes = [
  {
    name: "backend",
    color: "\x1b[36m",
    child: spawn(npmCmd, ["--workspace", "backend", "run", "dev"], {
      stdio: ["inherit", "pipe", "pipe"],
      shell: false,
    }),
  },
  {
    name: "frontend",
    color: "\x1b[35m",
    child: spawn(npmCmd, ["--workspace", "frontend", "run", "dev"], {
      stdio: ["inherit", "pipe", "pipe"],
      shell: false,
    }),
  },
];

const reset = "\x1b[0m";
let shuttingDown = false;

function prefixStream(stream, prefix) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.length > 0) {
        process.stdout.write(`${prefix}${line}${reset}\n`);
      }
    }
  });
  stream.on("end", () => {
    if (buffer.length > 0) {
      process.stdout.write(`${prefix}${buffer}${reset}\n`);
    }
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of processes) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }
  setTimeout(() => process.exit(code), 100);
}

for (const processInfo of processes) {
  const prefix = `${processInfo.color}[${processInfo.name}] `;
  prefixStream(processInfo.child.stdout, prefix);
  prefixStream(processInfo.child.stderr, prefix);
  processInfo.child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (signal || code !== 0) {
      const reason = signal ? `signal ${signal}` : `exit code ${code ?? 0}`;
      process.stderr.write(`${prefix}stopped with ${reason}${reset}\n`);
      shutdown(code ?? 1);
      return;
    }
    shutdown(0);
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
