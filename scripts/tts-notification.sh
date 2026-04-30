#!/usr/bin/env bash
# Notification hook: on permission requests, play a fixed cached phrase via Doubao TTS.
# Holds an exclusive lock so any concurrent Stop hook backs off.
set -u

LOCK="/tmp/claude-tts-notification.lock"
LOG="/tmp/claude-tts.log"
CACHE_DIR="$HOME/.claude/cache"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/tts-config.sh"

ENABLED=$(tts_config_get '.events.notification.enabled' 'true')
if [[ "$ENABLED" != "true" ]]; then
  cat >/dev/null 2>&1 || true
  exit 0
fi

PHRASE=$(tts_config_get '.events.notification.phrase' '等待授权')

payload=$(cat)
msg=$(printf '%s' "$payload" | jq -r '.message // empty' 2>/dev/null)
if [[ -z "$msg" ]]; then
  printf '%s [notif skip] no .message in payload: %s\n' "$(date +%H:%M:%S)" "${payload:0:200}" >> "$LOG"
  exit 0
fi
# Only speak permission-request notifications. Skip idle / waiting-for-input / questions.
if [[ "$msg" != *"needs your permission"* && "$msg" != *"permission to use"* ]]; then
  printf '%s [notif skip] non-permission: %s\n' "$(date +%H:%M:%S)" "$msg" >> "$LOG"
  exit 0
fi
printf '%s [notif fired] %s\n' "$(date +%H:%M:%S)" "$msg" >> "$LOG"

mkdir -p "$CACHE_DIR"
hash=$(printf '%s|%s' "$(tts_voice_signature)" "$PHRASE" | shasum -a 1 | cut -c1-12)
cache_file="$CACHE_DIR/tts-notif-$hash.mp3"

if [[ ! -s "$cache_file" ]]; then
  printf '%s [notif synth] %s -> %s\n' "$(date +%H:%M:%S)" "$PHRASE" "$cache_file" >> "$LOG"
  tmp=$(mktemp -t claude-tts-notif.XXX).mp3
  if "$SCRIPT_DIR/tts-doubao-synth.sh" "$PHRASE" "$tmp"; then
    mv "$tmp" "$cache_file"
  else
    rm -f "$tmp"
    printf '%s [notif synth fail]\n' "$(date +%H:%M:%S)" >> "$LOG"
    exit 0
  fi
fi

touch "$LOCK"
pkill -x afplay 2>/dev/null
pkill -x say 2>/dev/null

# Async play + release lock when audio finishes, so the hook returns fast
# and a concurrent Stop hook isn't blocked any longer than necessary.
( afplay "$cache_file"; rm -f "$LOCK" ) &

printf '%s [notif done] %s\n' "$(date +%H:%M:%S)" "$cache_file" >> "$LOG"
