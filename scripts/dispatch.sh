#!/usr/bin/env bash
# Runs one PLAN.md task with a free OpenCode model, in the current terminal so the user can watch it.
# Usage: scripts/dispatch.sh T06 opencode/big-pickle ["extra instructions"]
set -u
cd "$(dirname "$0")/.."
task=$1 model=$2 extra=${3:-}
prompt="Read AGENTS.md, then do task $task from PLAN.md. Read the Traps section first. Follow 'How to work' in PLAN.md exactly: test first, the commit subject as 'Area: one fact as a sentence', and change '- [ ] $task' to '- [x] $task' in PLAN.md in the same commit. Find answers in the C# source in ref/, do not ask the user. Check numbers and edge cases with a test or node -e, not in your head. Do only $task, then stop. At the end, print a short report and the commit hash. $extra"
mkdir -p .agent-log
opencode run -m "$model" --title "$task $model" "$prompt" 2>&1 | tee ".agent-log/$task-${model##*/}.log"
echo "=== DISPATCH END $task $model exit=${PIPESTATUS[0]}"
