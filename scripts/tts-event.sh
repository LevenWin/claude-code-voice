#!/usr/bin/env bash
# Generic event hook entry. Usage: tts-event.sh <event-key>
# Looks up .events.<event-key>.{enabled,phrase} from tts-config.json.
# If enabled, plays the phrase via tts-play.sh (cached fixed-phrase synth).
set -u

EVENT="${1:?usage: $0 <event-key>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/tts-config.sh"

ENABLED=$(tts_config_get ".events.\"$EVENT\".enabled" 'false')
if [[ "$ENABLED" != "true" ]]; then
  cat >/dev/null 2>&1 || true
  exit 0
fi

PHRASE=$(tts_config_get ".events.\"$EVENT\".phrase" '')
if [[ -z "$PHRASE" ]]; then
  cat >/dev/null 2>&1 || true
  exit 0
fi

exec "$SCRIPT_DIR/tts-play.sh" "$EVENT" "$PHRASE"
