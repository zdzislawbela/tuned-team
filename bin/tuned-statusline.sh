#!/bin/bash
# Claude Code status line for every window: folder, branch, model, ctx %.
# The window background shows the context used, as a red heatmap: black up to 10%,
# then darker to full red at 30% (time to clear). Counted against the model's real
# window: Opus = 1M tokens, even if Claude Code reports a smaller one.
# From 30% context: a CONTEXT ALERT line below (from 35% the agent hands its tasks over);
# after tuned-ready-to-clear: a green READY TO CLEAR line, only then /clear.
input=$(cat)
dir=$(echo "$input" | jq -r '.workspace.current_dir // .cwd')
model=$(echo "$input" | jq -r '.model.display_name')
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
size=$(echo "$input" | jq -r '.context_window.context_window_size // empty')
tokens=$(echo "$input" | jq -r '.context_window.current_usage | if . then (.input_tokens // 0) + (.cache_read_input_tokens // 0) + (.cache_creation_input_tokens // 0) else empty end')
if echo "$input" | jq -e '.model.id // "" | test("opus")' >/dev/null && [ -n "$tokens" ]; then
  used=$((tokens / 10000))
elif [ -n "$tokens" ] && [ -n "$size" ] && [ "$size" -gt 0 ]; then
  used=$((tokens * 100 / size))
fi
sid=$(echo "$input" | jq -r '.session_id // empty')
# tuned-ready-to-clear: the colleague finished and handed its tasks over, only /clear is left
ready=""; [ -n "$sid" ] && [ -f "$HOME/.claude/tuned-clear/$sid" ] && ready=1
branch=$(git -C "$dir" --no-optional-locks branch --show-current 2>/dev/null)

out=$(printf '\033[36m%s\033[0m' "$(basename "$dir")")
[ -n "$branch" ] && out="$out $(printf '\033[32m(%s)\033[0m' "$branch")"
out="$out | $model"

[ -z "$used" ] && [ -z "$ready" ] && { echo "$out"; exit 0; }
pct=$(printf '%.0f' "${used:-0}")

# Heatmap: red channel 0 at <=10%, 160 (#a00000) at >=30%, linear between.
# Sent to this window's terminal only when the colour changes.
heat=$(( (pct - 10) * 160 / 20 )); [ "$heat" -lt 0 ] && heat=0; [ "$heat" -gt 160 ] && heat=160
hex=$(printf '#%02x0000' "$heat")
if [ -n "$sid" ]; then
  mark="$HOME/.claude/tuned-heat/$sid"
  if [ "$(cat "$mark" 2>/dev/null)" != "$hex" ]; then
    mkdir -p "$HOME/.claude/tuned-heat"
    # /dev/tty if we have a controlling terminal, else the first parent (claude) that has one
    tty=/dev/tty; p=$$
    while ! { : > "$tty"; } 2>/dev/null && [ "${p:-1}" -gt 1 ]; do
      p=$(ps -o ppid= -p "$p" | tr -d ' '); t=$(ps -o tty= -p "$p" 2>/dev/null | tr -d ' ')
      case "$t" in ''|'??') tty=/dev/null-none;; *) tty="/dev/$t";; esac
    done
    { printf '\033]11;%s\007' "$hex" > "$tty"; } 2>/dev/null && echo "$hex" > "$mark"
  fi
fi
if [ "$pct" -lt 30 ] && [ -z "$ready" ]; then
  echo "$out | ctx ${pct}%"
  exit 0
fi
echo "$out | $(printf '\033[1;31mctx %s%%\033[0m' "$pct")"

# one line below the bar: CONTEXT ALERT (do not clear yet) or READY TO CLEAR (the manager restarts the window)
if [ -n "$ready" ]; then
  printf '\033[1;30;42m READY TO CLEAR \033[0m nothing is open, the manager restarts this window\n'
else
  printf '\033[1;30;47m CONTEXT ALERT \033[0m take no new tasks, finish the current one; from 35%% hand them to the deputy\n'
fi
