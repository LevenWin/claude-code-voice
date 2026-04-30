#!/usr/bin/env bash
# Generic fixed-phrase player. Usage: tts-play.sh <cache-key> "<phrase>"
# - Drains stdin (so hook JSON payload doesn't pollute downstream)
# - Skips if Notification (permission) is currently holding the audio lock
# - Synthesizes via Doubao TTS on first call, caches mp3 keyed by phrase hash
# - Cache invalidates automatically when phrase changes
set -u

CACHE_KEY="${1:?usage: $0 <cache-key> <phrase>}"
PHRASE="${2:?usage: $0 <cache-key> <phrase>}"

LOCK="/tmp/claude-tts-notification.lock"
LOG="/tmp/claude-tts.log"
CACHE_DIR="$HOME/.claude/cache"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/tts-config.sh"

# Drain stdin (Claude Code passes a JSON payload we don't need here)
cat >/dev/null 2>&1 || true

# Back off if Notification (highest-priority audio) is still playing
if [[ -f "$LOCK" ]]; then
  lock_age=$(( $(date +%s) - $(stat -f%m "$LOCK" 2>/dev/null || echo 0) ))
  if [[ "$lock_age" -lt 30 ]]; then
    printf '%s [%s skip] notification lock held (age=%ss)\n' "$(date +%H:%M:%S)" "$CACHE_KEY" "$lock_age" >> "$LOG"
    exit 0
  fi
  rm -f "$LOCK"
fi

mkdir -p "$CACHE_DIR"
hash=$(printf '%s|%s' "$(tts_voice_signature)" "$PHRASE" | shasum -a 1 | cut -c1-12)
cache_file="$CACHE_DIR/tts-$CACHE_KEY-$hash.mp3"

if [[ ! -s "$cache_file" ]]; then
  printf '%s [%s synth] %s -> %s\n' "$(date +%H:%M:%S)" "$CACHE_KEY" "$PHRASE" "$cache_file" >> "$LOG"
  tmp=$(mktemp -t "claude-tts-$CACHE_KEY.XXX").mp3
  if "$SCRIPT_DIR/tts-doubao-synth.sh" "$PHRASE" "$tmp"; then
    mv "$tmp" "$cache_file"
  else
    rm -f "$tmp"
    printf '%s [%s synth fail]\n' "$(date +%H:%M:%S)" "$CACHE_KEY" >> "$LOG"
    exit 0
  fi
fi

# Newer event supersedes older playback
pkill -x afplay 2>/dev/null

afplay "$cache_file" &
printf '%s [%s played] %s\n' "$(date +%H:%M:%S)" "$CACHE_KEY" "$cache_file" >> "$LOG"
exit 0
