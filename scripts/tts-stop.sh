#!/usr/bin/env bash
# Stop hook. Two modes (config: .events.stop.mode):
#   - "fixed-phrase"        → plays .events.stop.phrase (cached)
#   - "speak-last-message"  → reads .last_assistant_message from stdin payload, summarizes via GLM, speaks
set -u

LOCK="/tmp/claude-tts-notification.lock"
LOG="/tmp/claude-tts.log"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/tts-config.sh"

ENABLED=$(tts_config_get '.events.stop.enabled' 'true')
if [[ "$ENABLED" != "true" ]]; then
  cat >/dev/null 2>&1 || true
  exit 0
fi

MODE=$(tts_config_get '.events.stop.mode' 'fixed-phrase')

# Read payload (some modes need it; drain in any case so stdin doesn't pollute downstream)
payload=$(cat 2>/dev/null || true)

# Notification has priority — back off if its lock is held
if [[ -f "$LOCK" ]]; then
  lock_age=$(( $(date +%s) - $(stat -f%m "$LOCK" 2>/dev/null || echo 0) ))
  if [[ "$lock_age" -lt 30 ]]; then
    printf '%s [stop skip] notification lock held (age=%ss)\n' "$(date +%H:%M:%S)" "$lock_age" >> "$LOG"
    exit 0
  fi
  rm -f "$LOCK"
fi

if [[ "$MODE" == "speak-last-message" ]]; then
  last_text=$(printf '%s' "$payload" | jq -r '.last_assistant_message // empty' 2>/dev/null)
  if [[ -z "$last_text" ]]; then
    transcript_path=$(printf '%s' "$payload" | jq -r '.transcript_path // empty' 2>/dev/null)
    if [[ -n "$transcript_path" && -f "$transcript_path" ]]; then
      last_text=$(jq -rs '
        [ .[]
          | select(.type == "assistant")
          | (.message.content // [])
          | map(select(.type == "text") | .text)
          | select(length > 0)
          | join("\n")
        ] | last // ""
      ' "$transcript_path" 2>/dev/null)
    fi
  fi
  if [[ -z "$last_text" ]]; then
    printf '%s [stop skip] last assistant text empty\n' "$(date +%H:%M:%S)" >> "$LOG"
    exit 0
  fi
  printf '%s [stop fired speak-last] %s\n' "$(date +%H:%M:%S)" "${last_text:0:80}" >> "$LOG"
  pkill -x afplay 2>/dev/null
  "$SCRIPT_DIR/tts-speak.sh" "$last_text"
  exit 0
fi

# Default: fixed-phrase mode → delegate to tts-play.sh (cached)
PHRASE=$(tts_config_get '.events.stop.phrase' '已完成')
exec "$SCRIPT_DIR/tts-play.sh" "stop" "$PHRASE"
