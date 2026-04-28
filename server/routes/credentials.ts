import { Router } from "express";
import fs from "node:fs/promises";
import { CREDENTIAL_FILES, SCRIPTS_DIR } from "../lib/paths.ts";

const router = Router();

const FIELD_TO_FILE: Record<keyof typeof CREDENTIAL_FILES, string> = {
  doubaoAppId: CREDENTIAL_FILES.doubaoAppId,
  doubaoToken: CREDENTIAL_FILES.doubaoToken,
  glmKey: CREDENTIAL_FILES.glmKey,
};

router.get("/status", async (_req, res) => {
  const status: Record<string, boolean> = {};
  for (const [field, file] of Object.entries(FIELD_TO_FILE)) {
    try {
      const stat = await fs.stat(file);
      status[field] = stat.size > 0;
    } catch {
      status[field] = false;
    }
  }
  res.json(status);
});

router.put("/", async (req, res) => {
  try {
    const body = req.body as Record<string, string | undefined>;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "body must be a JSON object" });
    }
    await fs.mkdir(SCRIPTS_DIR, { recursive: true });
    const updated: string[] = [];
    for (const [field, file] of Object.entries(FIELD_TO_FILE)) {
      const value = body[field];
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        await fs.rm(file, { force: true });
      } else {
        await fs.writeFile(file, trimmed, { mode: 0o600 });
      }
      updated.push(field);
    }
    res.json({ ok: true, updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
