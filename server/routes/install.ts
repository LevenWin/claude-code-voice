import { Router } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { MANAGED_SCRIPTS, REPO_SCRIPTS_DIR, SCRIPTS_DIR } from "../lib/paths.ts";
import { installHooks, uninstallHooks, getInstalledStatus } from "../lib/settings-merge.ts";

const router = Router();

async function copyScripts(): Promise<{ copied: string[]; backedUp: string[] }> {
  await fs.mkdir(SCRIPTS_DIR, { recursive: true });
  const copied: string[] = [];
  const backedUp: string[] = [];

  for (const name of MANAGED_SCRIPTS) {
    const src = path.join(REPO_SCRIPTS_DIR, name);
    const dst = path.join(SCRIPTS_DIR, name);

    // Backup existing user-modified file (skip if identical or absent)
    try {
      const [srcStat, dstStat] = await Promise.all([fs.stat(src), fs.stat(dst).catch(() => null)]);
      if (dstStat && dstStat.size > 0) {
        const [srcContent, dstContent] = await Promise.all([
          fs.readFile(src),
          fs.readFile(dst),
        ]);
        if (!srcContent.equals(dstContent)) {
          const backup = `${dst}.bak.${Date.now()}`;
          await fs.copyFile(dst, backup);
          backedUp.push(backup);
        }
      }
      void srcStat;
    } catch {
      // ignore
    }

    await fs.copyFile(src, dst);
    if (name.endsWith(".sh")) {
      await fs.chmod(dst, 0o755);
    }
    copied.push(name);
  }

  return { copied, backedUp };
}

async function removeScripts(): Promise<string[]> {
  const removed: string[] = [];
  for (const name of MANAGED_SCRIPTS) {
    const dst = path.join(SCRIPTS_DIR, name);
    try {
      await fs.rm(dst);
      removed.push(name);
    } catch {
      // ignore
    }
  }
  return removed;
}

router.get("/status", async (_req, res) => {
  try {
    const scriptStatus: Record<string, boolean> = {};
    for (const name of MANAGED_SCRIPTS) {
      const dst = path.join(SCRIPTS_DIR, name);
      scriptStatus[name] = await fs
        .access(dst)
        .then(() => true)
        .catch(() => false);
    }
    const settings = await getInstalledStatus();
    res.json({ scripts: scriptStatus, ...settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (_req, res) => {
  try {
    const scriptResult = await copyScripts();
    const hookResult = await installHooks();
    res.json({ ok: true, scripts: scriptResult, hooks: hookResult });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/uninstall", async (req, res) => {
  try {
    const removeFiles = req.body?.removeScripts === true;
    const hookResult = await uninstallHooks();
    const scripts = removeFiles ? await removeScripts() : [];
    res.json({ ok: true, hooks: hookResult, scriptsRemoved: scripts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
