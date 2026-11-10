import { spawn } from "node:child_process";

const argv = process.argv.slice(2);
const env = { ...process.env };
const command = [];

for (const part of argv) {
  if (command.length === 0 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(part)) {
    const eq = part.indexOf("=");
    env[part.slice(0, eq)] = part.slice(eq + 1);
    continue;
  }
  command.push(part);
}

if (!command.length) {
  console.error("Usage: node scripts/run-with-env.mjs KEY=value <command>");
  process.exit(1);
}

const child = spawn(command[0], command.slice(1), {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
  windowsHide: true,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
