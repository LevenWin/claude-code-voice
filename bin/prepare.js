#!/usr/bin/env node
// Runs on `npm install` (including `npx github:...`).
// Builds the web UI and bundles the server so the runtime needs no
// build tools (vite, esbuild, tsx).

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const distIndex = path.join(REPO_ROOT, "web", "dist", "index.html");
const serverBundle = path.join(REPO_ROOT, "server", "dist", "server.mjs");
const viteBin = path.join(REPO_ROOT, "node_modules", ".bin", "vite");
const esbuildBin = path.join(REPO_ROOT, "node_modules", ".bin", "esbuild");

const webBuilt = await fileExists(distIndex);
const serverBuilt = await fileExists(serverBundle);
const viteAvailable = await fileExists(viteBin);
const esbuildAvailable = await fileExists(esbuildBin);

if (webBuilt && serverBuilt) {
  process.exit(0);
}

if (!viteAvailable || !esbuildAvailable) {
  console.error(
    "[claude-voice] prepare: build tools missing, skipping build.\n" +
      "  If this is a fresh clone, run `npm install --include=dev` from the repo."
  );
  process.exit(0);
}

if (!webBuilt) {
  console.log("[claude-voice] building web UI…");
  await run(viteBin, ["build"]);
}

if (!serverBuilt) {
  console.log("[claude-voice] bundling server…");
  await fs.mkdir(path.dirname(serverBundle), { recursive: true });
  await run(esbuildBin, [
    "server/index.ts",
    "--bundle",
    "--platform=node",
    "--format=esm",
    "--target=node18",
    "--packages=external",
    `--outfile=${path.relative(REPO_ROOT, serverBundle)}`,
  ]);
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", cwd: REPO_ROOT });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))
    );
  });
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
