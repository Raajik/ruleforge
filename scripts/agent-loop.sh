#!/usr/bin/env bash
# Runs the tasks in PLAN.md one at a time, each in a new pi session with the local model.
# Usage: scripts/agent-loop.sh [max tasks, default 3]
set -u
cd "$(dirname "$0")/.."
MODEL=${MODEL:-ollama/qwen3.6:35b-a3b-coding-ctx64k}
mkdir -p .agent-log

next_task() { grep -m1 -o '^- \[ \] T[0-9]*' PLAN.md | grep -o 'T[0-9]*'; }

for i in $(seq 1 "${1:-3}"); do
  if grep -q '^- \[!\]' PLAN.md; then echo "STOP: a task is blocked. See the BLOCKED line in PLAN.md."; exit 1; fi
  task=$(next_task)
  if [ -z "$task" ]; then echo "DONE: no open tasks."; exit 0; fi
  if grep -q "^- \[ \] $task USER" PLAN.md; then echo "STOP: $task needs the user."; exit 0; fi
  log=".agent-log/$(date +%F-%H%M)-$task.log"
  echo "=== $task ($log)"
  pi -p --model "$MODEL" --thinking high \
    "Read AGENTS.md, then do task $task from PLAN.md. Follow 'How to work' in PLAN.md exactly. Do only $task, then stop." \
    >"$log" 2>&1
  tail -5 "$log"
  # A task that did not tick its box, or left the tests red, stops the loop for a human look.
  if [ "$(next_task)" = "$task" ] && ! grep -q "^- \[!\] $task" PLAN.md; then
    echo "STOP: $task is still open after the session. Read $log."; exit 1
  fi
  if ! npm test --silent >/dev/null 2>&1 || ! npm run --silent typecheck >/dev/null 2>&1; then
    echo "STOP: tests or typecheck fail after $task."; exit 1
  fi
done
