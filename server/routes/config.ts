import { Router } from "express";
import fs from "node:fs/promises";
import { REPO_DEFAULT_CONFIG, USER_CONFIG, SCRIPTS_DIR } from "../lib/paths.ts";

const router = Router();

async function readJson(file: string): Promise<unknown> {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

router.get("/", async (_req, res) => {
  try {
    const defaults = await readJson(REPO_DEFAULT_CONFIG);
    let user: unknown = null;
    try {
      user = await readJson(USER_CONFIG);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }
    res.json({ defaults, user, effective: user ?? defaults });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/", async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "body must be a JSON object" });
    }
    await fs.mkdir(SCRIPTS_DIR, { recursive: true });
    await fs.writeFile(USER_CONFIG, JSON.stringify(body, null, 2) + "\n", "utf8");
    res.json({ ok: true, path: USER_CONFIG });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/defaults", async (_req, res) => {
  try {
    const defaults = await readJson(REPO_DEFAULT_CONFIG);
    res.json(defaults);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
