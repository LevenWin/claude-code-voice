#!/usr/bin/env bash
# Doubao TTS v3 unidirectional HTTP synth. Usage: tts-doubao-synth.sh "text" "/tmp/out.mp3"
# Endpoint returns NDJSON stream; each line is {code,data} where data is base64 mp3 chunk.
# code=0 → audio frame; code=20000000 → end of stream; other → error.
set -u

TEXT="${1:-}"
OUT="${2:-}"
LOG="/tmp/claude-tts.log"

[[ -z "$TEXT" || -z "$OUT" ]] && { echo "usage: $0 <text> <out.mp3>" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/tts-config.sh"

VOICE=$(tts_config_get '.doubao.voice' 'zh_female_roumeinvyou_uranus_bigtts')
RESOURCE_ID=$(tts_config_get '.doubao.resource_id' 'seed-tts-2.0')
SPEECH_RATE=$(tts_config_get '.doubao.speech_rate' '20')
ENDPOINT=$(tts_config_get '.doubao.endpoint' 'https://openspeech.bytedance.com/api/v3/tts/unidirectional')

APPID=$(tts_credential_get 'doubao-appid')
TOKEN=$(tts_credential_get 'doubao-token')

[[ -z "$APPID" ]] && { printf '%s [tts] missing doubao-appid\n' "$(date +%H:%M:%S)" >> "$LOG"; exit 2; }
[[ -z "$TOKEN" ]] && { printf '%s [tts] missing doubao-token\n' "$(date +%H:%M:%S)" >> "$LOG"; exit 2; }

payload=$(VOICE="$VOICE" SPEECH_RATE="$SPEECH_RATE" TEXT="$TEXT" python3 -c '
import json, os
print(json.dumps({
    "user": {"uid": "claude-code"},
    "req_params": {
        "text": os.environ["TEXT"],
        "speaker": os.environ["VOICE"],
        "audio_params": {
            "format": "mp3",
            "sample_rate": 24000,
            "speech_rate": int(os.environ["SPEECH_RATE"]),
        },
    },
}, ensure_ascii=False))
')

response=$(curl -sS --max-time 15 \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-Api-App-Id: $APPID" \
  -H "X-Api-Access-Key: $TOKEN" \
  -H "X-Api-Resource-Id: $RESOURCE_ID" \
  --data-raw "$payload" 2>>"$LOG")

printf '%s' "$response" | python3 -c '
import json, sys, base64
chunks = []
err = None
for line in sys.stdin.read().splitlines():
    line = line.strip()
    if not line:
        continue
    try:
        d = json.loads(line)
    except Exception as e:
        err = f"parse: {e}; line={line[:200]}"
        continue
    code = d.get("code")
    if code == 0 and d.get("data"):
        chunks.append(base64.b64decode(d["data"]))
    elif code == 20000000:
        break
    else:
        err = f"frame: {json.dumps(d, ensure_ascii=False)[:300]}"
if not chunks:
    detail = err if err else "empty stream"
    sys.stderr.write("[tts] no audio; " + detail + "\n")
    sys.exit(4)
sys.stdout.buffer.write(b"".join(chunks))
' > "$OUT" 2>>"$LOG"

rc=$?
if [[ $rc -ne 0 || ! -s "$OUT" ]]; then
  printf '%s [tts synth fail rc=%s] %s\n' "$(date +%H:%M:%S)" "$rc" "${TEXT:0:60}" >> "$LOG"
  rm -f "$OUT"
  exit "${rc:-6}"
fi

printf '%s [tts ok %s bytes] %s\n' "$(date +%H:%M:%S)" "$(stat -f%z "$OUT")" "${TEXT:0:60}" >> "$LOG"
exit 0
