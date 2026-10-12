#!/bin/bash
# Claude Code status line for every window: folder, branch, model, ctx %.
# From 30% context: a CONTEXT ALERT line below (from 35% the agent hands its tasks over);
# after tuned-daj-clear: a green READY TO CLEAR line, only then /clear.
input=$(cat)
dir=$(echo "$input" | jq -r '.workspace.current_dir // .cwd')
model=$(echo "$input" | jq -r '.model.display_name')
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
sid=$(echo "$input" | jq -r '.session_id // empty')
# tuned-daj-clear: the colleague finished and handed its tasks over, only /clear is left
ready=""; [ -n "$sid" ] && [ -f "$HOME/.claude/tuned-clear/$sid" ] && ready=1
branch=$(git -C "$dir" --no-optional-locks branch --show-current 2>/dev/null)

out=$(printf '\033[36m%s\033[0m' "$(basename "$dir")")
[ -n "$branch" ] && out="$out $(printf '\033[32m(%s)\033[0m' "$branch")"
out="$out | $model"

[ -z "$used" ] && [ -z "$ready" ] && { echo "$out"; exit 0; }
pct=$(printf '%.0f' "${used:-0}")
if [ "$pct" -lt 30 ] && [ -z "$ready" ]; then
  echo "$out | ctx ${pct}%"
  exit 0
fi
echo "$out | $(printf '\033[1;31mctx %s%%\033[0m' "$pct")"

# one line below the bar: CONTEXT ALERT (do not clear yet) or READY TO CLEAR (you can /clear)
if [ -n "$ready" ]; then
  printf '\033[1;30;42m READY TO CLEAR \033[0m nothing is open, type /clear\n'
else
  printf '\033[1;30;47m CONTEXT ALERT \033[0m take no new tasks, finish the current one; from 35%% hand them to the deputy\n'
fi
