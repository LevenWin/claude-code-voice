#!/usr/bin/env bash
# UserPromptSubmit hook: silence everything when the user starts typing back.
pkill -x afplay 2>/dev/null
pkill -x say 2>/dev/null
rm -f /tmp/claude-tts-notification.lock
date +%s > /tmp/claude-tts-cancel
exit 0
