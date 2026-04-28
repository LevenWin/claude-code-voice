#!/usr/bin/env bash
# Shared config reader. Source this file from any tts-*.sh.
# Resolution order: ~/.claude/scripts/tts-config.json -> tts-config-default.json (next to this file) -> hardcoded fallback arg.
# Usage: value=$(tts_config_get '.events."stop".phrase' "default text")
set -u

CCVOICE_USER_CONFIG="$HOME/.claude/scripts/tts-config.json"
CCVOICE_DEFAULT_CONFIG="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/tts-config-default.json"

tts_config_get() {
  local query="$1"
  local fallback="${2-}"
  local value=""
  if [[ -r "$CCVOICE_USER_CONFIG" ]]; then
    value=$(jq -r "$query // empty" "$CCVOICE_USER_CONFIG" 2>/dev/null)
  fi
  if [[ -z "$value" || "$value" == "null" ]] && [[ -r "$CCVOICE_DEFAULT_CONFIG" ]]; then
    value=$(jq -r "$query // empty" "$CCVOICE_DEFAULT_CONFIG" 2>/dev/null)
  fi
  if [[ -z "$value" || "$value" == "null" ]]; then
    value="$fallback"
  fi
  printf '%s' "$value"
}

# Read credential file (one of: .doubao-appid, .doubao-token, .glm-key).
# Strips whitespace. Returns empty if file missing.
tts_credential_get() {
  local name="$1"
  local file="$HOME/.claude/scripts/.$name"
  if [[ -r "$file" ]]; then
    tr -d '[:space:]' < "$file"
  fi
}
