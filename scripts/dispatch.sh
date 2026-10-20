#!/usr/bin/env bash
# Runs one PLAN.md task with a free OpenCode model, in the current terminal so the user can watch it.
# Usage: scripts/dispatch.sh T06 opencode/big-pickle ["extra instructions"]
set -u
cd "$(dirname "$0")/.."
task=$1 model=$2 extra=${3:-}
prompt="Read AGENTS.md, then do task $task from PLAN.md. Read the Traps section first. Follow 'How to work' in PLAN.md exactly: test first, the commit subject as 'Area: one fact as a sentence', and change '- [ ] $task' to '- [x] $task' in PLAN.md in the same commit. Find answers in the C# source in ref/, do not ask the user. Check numbers and edge cases with a test or node -e, not in your head. Add a test for each new type or function. Before the commit, npm test and npm run typecheck must both pass. Never connect to a browser, debug port or app that you did not start yourself. Do only $task, then stop. At the end, print a short report and the commit hash. $extra"
mkdir -p .agent-log
# A model "omp:<provider/model>" runs in the omp harness, which has the user's Ponytail and STE packages.
case $model in
  omp:*) echo "" | omp -p "$prompt" --model "${model#omp:}" 2>&1 | tee ".agent-log/$task-${model##*/}.log" ;;
  *) opencode run -m "$model" --title "$task $model" "$prompt" 2>&1 | tee ".agent-log/$task-${model##*/}.log" ;;
esac
status=${PIPESTATUS[0]}
# Record a rate-limit hit, so pick-model.sh skips this model for 5 hours.
grep -q -E "Rate limit exceeded|429 " ".agent-log/$task-${model##*/}.log" && printf '%s\t%s\n' "$(date +%s)" "$model" >> ~/.local/state/opencode-limits.tsv
echo "=== DISPATCH END $task $model exit=$status"
# The orchestrator waits for this file, not for the process.
echo "$status" > ".agent-log/$task.done"
