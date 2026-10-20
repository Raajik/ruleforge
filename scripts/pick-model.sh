#!/usr/bin/env bash
# Prints the first free model in the rotation with no rate-limit hit in the last 5 hours.
# dispatch.sh in each project records each hit in ~/.local/state/opencode-limits.tsv as "<epoch>\t<model>".
# shortcut: the 5-hour window is the user's estimate (2026-10-19), not a documented OpenCode limit.
cd "$(dirname "$0")/.."
now=$(date +%s)
for m in opencode/big-pickle opencode/mimo-v2.6-flash-free opencode/longcat-2.5-preview-free  \
         opencode/deepseek-v4.1-flash-free; do
  last=$(awk -F'\t' -v m="$m" '$2 == m { t = $1 } END { print t + 0 }' ~/.local/state/opencode-limits.tsv 2>/dev/null)
  if [ $((now - ${last:-0})) -ge 18000 ]; then echo "$m"; exit 0; fi
done
exit 1
