import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const env = { ...process.env };
const command = [];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env"));

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
