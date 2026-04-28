import fs from "node:fs/promises";
import { SETTINGS_FILE, HOOK_BINDINGS } from "./paths.ts";

type HookEntry = { type: string; command: string; timeout?: number; async?: boolean };
type HookBlock = { hooks: HookEntry[] };
type SettingsHooks = Record<string, HookBlock[]>;
type Settings = { hooks?: SettingsHooks; [k: string]: unknown };

const MARKER_PREFIX = "~/.claude/scripts/tts-";

async function readSettings(): Promise<Settings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf8");
    return JSON.parse(raw) as Settings;
  } catch (err: any) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

async function writeSettings(settings: Settings): Promise<void> {
  const json = JSON.stringify(settings, null, 2) + "\n";
  await fs.writeFile(SETTINGS_FILE, json, "utf8");
}

function isOurHook(entry: HookEntry): boolean {
  return entry.type === "command" && entry.command.startsWith(MARKER_PREFIX);
}

function stripOurHooks(hooks: SettingsHooks): SettingsHooks {
  const out: SettingsHooks = {};
  for (const [event, blocks] of Object.entries(hooks)) {
    const cleanedBlocks = blocks
      .map((b) => ({ ...b, hooks: b.hooks.filter((h) => !isOurHook(h)) }))
      .filter((b) => b.hooks.length > 0);
    if (cleanedBlocks.length > 0) out[event] = cleanedBlocks;
  }
  return out;
}

/**
 * Install hooks: remove any of our prior hooks, then add fresh ones.
 * Preserves any hooks that don't match MARKER_PREFIX.
 */
export async function installHooks(): Promise<{ events: string[] }> {
  const settings = await readSettings();
  const existing = settings.hooks ?? {};
  const cleaned = stripOurHooks(existing);

  for (const binding of HOOK_BINDINGS) {
    const entry: HookEntry = {
      type: "command",
      command: binding.command,
      timeout: binding.timeout,
    };
    if (binding.async) entry.async = true;

    const block: HookBlock = { hooks: [entry] };
    if (!cleaned[binding.event]) cleaned[binding.event] = [];
    cleaned[binding.event].push(block);
  }

  settings.hooks = cleaned;
  await writeSettings(settings);
  return { events: HOOK_BINDINGS.map((b) => b.event) };
}

/**
 * Uninstall hooks: remove only our hooks, preserve everything else.
 */
export async function uninstallHooks(): Promise<{ removed: number }> {
  const settings = await readSettings();
  if (!settings.hooks) return { removed: 0 };

  const before = JSON.stringify(settings.hooks);
  settings.hooks = stripOurHooks(settings.hooks);
  const after = JSON.stringify(settings.hooks);

  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;

  await writeSettings(settings);
  return { removed: before === after ? 0 : 1 };
}

export async function getInstalledStatus(): Promise<{
  settingsExists: boolean;
  hookEvents: string[];
}> {
  const settings = await readSettings();
  const hooks = settings.hooks ?? {};
  const ourEvents: string[] = [];
  for (const [event, blocks] of Object.entries(hooks)) {
    for (const block of blocks) {
      if (block.hooks.some(isOurHook)) {
        ourEvents.push(event);
        break;
      }
    }
  }
  return {
    settingsExists: await fs
      .access(SETTINGS_FILE)
      .then(() => true)
      .catch(() => false),
    hookEvents: ourEvents,
  };
}
