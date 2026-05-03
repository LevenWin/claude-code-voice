import { Router } from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  CACHE_DIR,
  MANAGED_SCRIPTS,
  REPO_DEFAULT_CONFIG,
  REPO_DEFAULTS_AUDIO_DIR,
  REPO_SCRIPTS_DIR,
  SCRIPTS_DIR,
} from "../lib/paths.ts";
import { installHooks, uninstallHooks, getInstalledStatus } from "../lib/settings-merge.ts";

const router = Router();

// Pre-warm ~/.claude/cache/ with the bundled default mp3s, named to match the
// hash that tts-play.sh / tts-notification.sh will compute from the default
// config. Lets brand-new installs play voice notifications immediately, with
// no Doubao token configured. Existing cache files are never overwritten.
async function seedDefaultAudio(): Promise<{ seeded: string[]; skipped: string[] }> {
  const seeded: string[] = [];
  const skipped: string[] = [];

  const cfgRaw = await fs.readFile(REPO_DEFAULT_CONFIG, "utf8").catch(() => "");
  if (!cfgRaw) return { seeded, skipped };
  let cfg: any;
  try {
    cfg = JSON.parse(cfgRaw);
  } catch {
    return { seeded, skipped };
  }

  const { voice = "", speech_rate = "", resource_id = "" } = cfg.doubao ?? {};
  const sigPart = `${voice}|${speech_rate}|${resource_id}`;

  await fs.mkdir(CACHE_DIR, { recursive: true });

  for (const [event, ev] of Object.entries(cfg.events ?? {}) as Array<[string, any]>) {
    const phrase: string | undefined = ev?.phrase;
    if (!phrase) continue;

    const src = path.join(REPO_DEFAULTS_AUDIO_DIR, `${event}.mp3`);
    const srcExists = await fs.access(src).then(() => true).catch(() => false);
    if (!srcExists) continue;

    const cacheKey = event === "notification" ? "notif" : event;
    const hash = crypto
      .createHash("sha1")
      .update(`${sigPart}|${phrase}`)
      .digest("hex")
      .slice(0, 12);
    const dst = path.join(CACHE_DIR, `tts-${cacheKey}-${hash}.mp3`);

    if (await fs.access(dst).then(() => true).catch(() => false)) {
      skipped.push(path.basename(dst));
      continue;
    }
    await fs.copyFile(src, dst);
    seeded.push(path.basename(dst));
  }

  return { seeded, skipped };
}

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
    const audioResult = await seedDefaultAudio();
    res.json({ ok: true, scripts: scriptResult, hooks: hookResult, audio: audioResult });
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
