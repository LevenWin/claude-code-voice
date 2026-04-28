#!/usr/bin/env node
// claude-voice CLI: starts the local web UI for configuring Claude Code voice notifications.

import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const cmd = args[0] ?? "serve";

if (cmd === "--help" || cmd === "-h" || cmd === "help") {
  printHelp();
  process.exit(0);
}

if (cmd === "version" || cmd === "--version" || cmd === "-v") {
  const pkg = JSON.parse(await fs.readFile(path.join(REPO_ROOT, "package.json"), "utf8"));
  console.log(pkg.version);
  process.exit(0);
}

if (cmd !== "serve") {
  console.error(`Unknown command: ${cmd}\n`);
  printHelp();
  process.exit(1);
}

await serve();

function printHelp() {
  console.log(`
Claude Code Voice — 配置 Claude Code 的语音播报

用法:
  claude-voice [serve]      启动本地 Web 配置界面（默认）
  claude-voice version      显示版本号
  claude-voice --help       显示帮助

环境变量:
  CCVOICE_PORT              Web 端口（默认 7654）
  CCVOICE_HOST              绑定地址（默认 127.0.0.1）
  CCVOICE_NO_OPEN=1         启动后不自动打开浏览器
`);
}

async function serve() {
  const serverBundle = path.join(REPO_ROOT, "server", "dist", "server.mjs");
  const webIndex = path.join(REPO_ROOT, "web", "dist", "index.html");

  if (!(await fileExists(serverBundle)) || !(await fileExists(webIndex))) {
    console.log("[claude-voice] build artifacts missing, building…");
    await runCmd("node", [path.join(REPO_ROOT, "bin", "prepare.js")]);
  }

  if (!(await fileExists(serverBundle))) {
    console.error(
      "[claude-voice] 构建失败：server bundle 仍然不存在。\n" +
        "  请在仓库目录运行 `npm install --include=dev` 后重试。"
    );
    process.exit(1);
  }

  const port = process.env.CCVOICE_PORT ?? "7654";
  const host = process.env.CCVOICE_HOST ?? "127.0.0.1";
  const url = `http://${host}:${port}`;

  const child = spawn(process.execPath, [serverBundle], {
    stdio: "inherit",
    cwd: REPO_ROOT,
    env: { ...process.env, CCVOICE_PORT: port, CCVOICE_HOST: host },
  });

  if (process.env.CCVOICE_NO_OPEN !== "1") {
    setTimeout(async () => {
      try {
        const { default: open } = await import("open");
        await open(url);
      } catch {
        // best-effort
      }
    }, 800);
  }

  child.on("exit", (code) => process.exit(code ?? 0));
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

function runCmd(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", cwd: REPO_ROOT });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} failed`))
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
