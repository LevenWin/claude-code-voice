import { Router } from "express";
import { spawn, ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import { LOG_FILE } from "../lib/paths.ts";

const router = Router();

router.get("/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Ensure log file exists so tail doesn't error
  try {
    await fs.access(LOG_FILE);
  } catch {
    await fs.writeFile(LOG_FILE, "");
  }

  const tail: ChildProcess = spawn("tail", ["-n", "50", "-F", LOG_FILE], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const send = (line: string) => {
    res.write(`data: ${line}\n\n`);
  };

  let buffer = "";
  tail.stdout?.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.length > 0) send(line);
    }
  });

  tail.on("close", () => {
    res.end();
  });

  req.on("close", () => {
    tail.kill();
  });
});

router.delete("/", async (_req, res) => {
  try {
    await fs.writeFile(LOG_FILE, "");
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
