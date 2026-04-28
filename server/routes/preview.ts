import { Router } from "express";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { REPO_SCRIPTS_DIR, SCRIPTS_DIR } from "../lib/paths.ts";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const text = (req.body?.text ?? "").toString().trim();
    if (!text) return res.status(400).json({ error: "text required" });
    if (text.length > 200) return res.status(400).json({ error: "text too long (max 200)" });

    // Prefer installed copy (so it picks up the user's tts-config.json), fall back to repo copy
    const installedScript = path.join(SCRIPTS_DIR, "tts-doubao-synth.sh");
    const repoScript = path.join(REPO_SCRIPTS_DIR, "tts-doubao-synth.sh");
    const script = (await fs
      .access(installedScript)
      .then(() => true)
      .catch(() => false))
      ? installedScript
      : repoScript;

    const out = path.join(os.tmpdir(), `claude-voice-preview-${Date.now()}.mp3`);
    const child = spawn(script, [text, out], { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    child.on("close", async (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: `synth failed (rc=${code})`, stderr });
      }
      try {
        const mp3 = await fs.readFile(out);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", mp3.length);
        res.send(mp3);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      } finally {
        await fs.rm(out, { force: true });
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
