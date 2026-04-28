#!/usr/bin/env node
// Runs on `npm install` (including `npx github:...`).
// Builds the web UI if vite is available; if not (production install
// without devDependencies), checks for a pre-built web/dist and is a no-op.

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const distIndex = path.join(REPO_ROOT, "web", "dist", "index.html");
const viteBin = path.join(REPO_ROOT, "node_modules", ".bin", "vite");

const distExists = await fileExists(distIndex);
const viteExists = await fileExists(viteBin);

if (distExists) {
  // Already built (e.g. shipped via git or a prior install). Nothing to do.
  process.exit(0);
}

if (!viteExists) {
  console.error(
    "[claude-voice] prepare: vite not installed and no pre-built web/dist found.\n" +
      "  Run `npm install --include=dev && npm run build` from the repo to build the UI."
  );
  // Don't fail install — server can still start and show a placeholder page.
  process.exit(0);
}

console.log("[claude-voice] building web UI…");
await new Promise((resolve, reject) => {
  const child = spawn(viteBin, ["build"], { stdio: "inherit", cwd: REPO_ROOT });
  child.on("exit", (code) =>
    code === 0 ? resolve() : reject(new Error(`vite build exited ${code}`))
  );
});

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
