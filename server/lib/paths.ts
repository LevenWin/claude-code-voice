import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repo paths (where this package lives).
// In source, __dirname is server/lib. In the bundled build, it's server/dist.
// Walk up until we find package.json.
function findRepoRoot(start: string): string {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    dir = path.dirname(dir);
  }
  return start;
}
export const REPO_ROOT = findRepoRoot(__dirname);
export const REPO_SCRIPTS_DIR = path.join(REPO_ROOT, "scripts");
export const REPO_DEFAULT_CONFIG = path.join(REPO_SCRIPTS_DIR, "tts-config-default.json");
export const REPO_DEFAULTS_AUDIO_DIR = path.join(REPO_SCRIPTS_DIR, "defaults");
export const REPO_WEB_DIST = path.join(REPO_ROOT, "web", "dist");

// User paths (where Claude Code looks)
export const HOME = os.homedir();
export const CLAUDE_DIR = path.join(HOME, ".claude");
export const SCRIPTS_DIR = path.join(CLAUDE_DIR, "scripts");
export const CACHE_DIR = path.join(CLAUDE_DIR, "cache");
export const SETTINGS_FILE = path.join(CLAUDE_DIR, "settings.json");
export const USER_CONFIG = path.join(SCRIPTS_DIR, "tts-config.json");
export const LOG_FILE = "/tmp/claude-tts.log";

export const CREDENTIAL_FILES = {
  doubaoAppId: path.join(SCRIPTS_DIR, ".doubao-appid"),
  doubaoToken: path.join(SCRIPTS_DIR, ".doubao-token"),
  glmKey: path.join(SCRIPTS_DIR, ".glm-key"),
} as const;

// All ttp-* scripts that get installed to ~/.claude/scripts/
export const MANAGED_SCRIPTS = [
  "tts-config.sh",
  "tts-config-default.json",
  "tts-doubao-synth.sh",
  "tts-play.sh",
  "tts-speak.sh",
  "tts-event.sh",
  "tts-stop.sh",
  "tts-notification.sh",
  "tts-interrupt.sh",
] as const;

// Hooks definition that gets merged into ~/.claude/settings.json
// Each entry: [hookEvent, scriptName, args, timeoutSec, async]
export const HOOK_BINDINGS: Array<{
  event: string;
  command: string;
  timeout: number;
  async?: boolean;
}> = [
  { event: "Stop",             command: "~/.claude/scripts/tts-stop.sh",                            timeout: 15, async: true },
  { event: "Notification",     command: "~/.claude/scripts/tts-notification.sh",                    timeout: 15, async: true },
  { event: "UserPromptSubmit", command: "~/.claude/scripts/tts-interrupt.sh",                       timeout: 3 },
  { event: "StopFailure",      command: "~/.claude/scripts/tts-event.sh stop-failure",              timeout: 15, async: true },
  { event: "SubagentStop",     command: "~/.claude/scripts/tts-event.sh subagent-stop",             timeout: 15, async: true },
  { event: "PreCompact",       command: "~/.claude/scripts/tts-event.sh pre-compact",               timeout: 15, async: true },
  { event: "SessionStart",     command: "~/.claude/scripts/tts-event.sh session-start",             timeout: 15, async: true },
  { event: "SessionEnd",       command: "~/.claude/scripts/tts-event.sh session-end",               timeout: 15, async: true },
  { event: "TaskCompleted",    command: "~/.claude/scripts/tts-event.sh task-completed",            timeout: 15, async: true },
  { event: "WorktreeCreate",   command: "~/.claude/scripts/tts-event.sh worktree-create",           timeout: 15, async: true },
];
