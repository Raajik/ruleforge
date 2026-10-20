#!/usr/bin/env bash
# Prints the model for the next task: the first free model that has no rate-limit hit in the last 5 hours and
# runs no other task now. When no free model fits, it prints the paid OpenCode Go DeepSeek (user, 2026-10-19:
# "free models first"). dispatch.sh in each project records each hit in ~/.local/state/opencode-limits.tsv.
# shortcut: the 5-hour window is the user's estimate (2026-10-19), not a documented OpenCode limit.
now=$(date +%s)
# DeepSeek first: the user gets the best results from it (2026-10-19).
for m in opencode/deepseek-v4.1-flash-free opencode/big-pickle opencode/mimo-v2.6-flash-free \
         opencode/longcat-2.5-preview-free; do
  last=$(awk -F'\t' -v m="$m" '$2 == m { t = $1 } END { print t + 0 }' ~/.local/state/opencode-limits.tsv 2>/dev/null)
  [ $((now - ${last:-0})) -lt 18000 ] && continue
  pgrep -f "opencode[.]exe run -m $m " >/dev/null && continue
  echo "$m"; exit 0
done
echo opencode-go/deepseek-v4.1-flash
