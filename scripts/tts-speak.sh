#!/usr/bin/env bash
# Shared TTS helper for arbitrary text. Usage: tts-speak.sh "text to speak"
# Reads text from $1 (or stdin if $1 empty), preprocesses, optionally summarizes via GLM, then synthesizes.
set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/tts-config.sh"

LOG="/tmp/claude-tts.log"
CANCEL_FILE="/tmp/claude-tts-cancel"

GLM_ENABLED=$(tts_config_get '.glm.enabled' 'true')
GLM_MODEL=$(tts_config_get '.glm.model' 'glm-4-flash')
GLM_TIMEOUT=$(tts_config_get '.glm.timeout' '5')
GLM_ENDPOINT=$(tts_config_get '.glm.endpoint' 'https://open.bigmodel.cn/api/paas/v4/chat/completions')
MAX_CHARS=$(tts_config_get '.glm.max_chars' '500')
SUMMARY_THRESHOLD=$(tts_config_get '.glm.summary_threshold' '80')
FALLBACK_CHARS=$(tts_config_get '.glm.fallback_chars' '120')

text="${1:-}"
if [[ -z "$text" ]]; then
  text="$(cat)"
fi
[[ -z "$text" ]] && exit 0

# Preprocess: strip markdown / emoji / code / urls — keep wording intact
cleaned=$(printf '%s' "$text" | python3 -c '
import sys, re
t = sys.stdin.read()
t = re.sub(r"```[\s\S]*?```", " ", t)
t = re.sub(r"`([^`]*)`", r"\1", t)
t = re.sub(r"\[([^\]\n]+)\]\([^)\n]+\)", r"\1", t)
t = re.sub(r"(?m)^\s*\|.*$", "", t)
t = re.sub(r"https?://\S+", "链接", t)
t = re.sub(r"(?m)^\s*[-*+]\s+", "", t)
t = re.sub(r"(?m)^\s*\d+\.\s+", "", t)
t = re.sub(r"[*_#~>`|]", "", t)
t = re.sub(r"[\U0001F000-\U0001FFFF\U00002600-\U000027BF]", "", t)
t = re.sub(r"[ \t]+", " ", t)
t = re.sub(r"\n{2,}", "\n\n", t).strip()
print(t)
')

truncated=$(printf '%s' "$cleaned" | MAX_CHARS="$MAX_CHARS" python3 -c "
import sys, os
t = sys.stdin.read().strip()
m = int(os.environ['MAX_CHARS'])
print(t[:m] + ('…' if len(t) > m else ''))
")

[[ -z "$truncated" ]] && exit 0

START_TS=$(date +%s)

(
  spoken="$truncated"
  GLM_KEY=$(tts_credential_get 'glm-key')

  char_count=$(printf '%s' "$truncated" | python3 -c 'import sys; print(len(sys.stdin.read()))')
  if [[ "$GLM_ENABLED" == "true" && "$char_count" -gt "$SUMMARY_THRESHOLD" && -n "$GLM_KEY" ]]; then
    payload=$(GLM_MODEL="$GLM_MODEL" TEXT="$truncated" python3 -c '
import json, os
sys_prompt = (
    "你是中文语音播报压缩器。任务：把 Claude 的回复压缩用于口播。\n"
    "硬性规则：\n"
    "1. 必须保留：英文术语、文件路径、命令名、数字、参数名、技术名词。\n"
    "2. 只删除：客套话、过渡词、解释性从句、修饰副词。\n"
    "3. 不要换说法、不要重新表达。压缩后的句子里，每个实词都必须在原文出现过。\n"
    "4. 100 字以内。\n"
    "5. 直接输出压缩文本，不加前缀、引号、解释。"
)
print(json.dumps({
    "model": os.environ["GLM_MODEL"],
    "messages": [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": "原文：" + os.environ["TEXT"] + "\n压缩："},
    ],
    "temperature": 0.0,
    "max_tokens": 220,
    "stream": False,
}, ensure_ascii=False))
')

    response=$(curl -sS --max-time "$GLM_TIMEOUT" \
      -X POST "$GLM_ENDPOINT" \
      -H "Authorization: Bearer $GLM_KEY" \
      -H "Content-Type: application/json" \
      -d "$payload" 2>>"$LOG")

    summarized=$(printf '%s' "$response" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d["choices"][0]["message"]["content"].strip())
except Exception:
    pass
' 2>>"$LOG")

    if [[ -n "$summarized" ]]; then
      spoken="$summarized"
      printf '%s [summarize ok] %s -> %s\n' "$(date +%H:%M:%S)" "${truncated:0:60}" "${summarized:0:60}" >> "$LOG"
    else
      spoken=$(printf '%s' "$truncated" | FALLBACK_CHARS="$FALLBACK_CHARS" python3 -c "
import sys, os
t = sys.stdin.read().strip()
m = int(os.environ['FALLBACK_CHARS'])
print(t[:m] + ('…' if len(t) > m else ''))
")
      printf '%s [summarize fail, fallback to %s chars]\n' "$(date +%H:%M:%S)" "$FALLBACK_CHARS" >> "$LOG"
    fi
  fi

  printf '%s [speak] %s\n' "$(date +%H:%M:%S)" "${spoken:0:80}" >> "$LOG"

  CANCEL_TS=$(cat "$CANCEL_FILE" 2>/dev/null || echo 0)
  if [[ "$CANCEL_TS" -ge "$START_TS" ]]; then
    printf '%s [cancelled by user input]\n' "$(date +%H:%M:%S)" >> "$LOG"
    exit 0
  fi

  mp3=$(mktemp -t claude-tts.XXX).mp3
  trap 'rm -f "$mp3"' EXIT
  if ! "$SCRIPT_DIR/tts-doubao-synth.sh" "$spoken" "$mp3"; then
    exit 0
  fi

  CANCEL_TS=$(cat "$CANCEL_FILE" 2>/dev/null || echo 0)
  if [[ "$CANCEL_TS" -ge "$START_TS" ]]; then
    printf '%s [cancelled before play]\n' "$(date +%H:%M:%S)" >> "$LOG"
    exit 0
  fi

  afplay "$mp3"
) </dev/null >>"$LOG" 2>&1 &
disown
exit 0
