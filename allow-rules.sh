#!/bin/sh
# Adds the rules the team needs in Claude Code auto mode to ~/.claude/settings.json.
# Shows the exact diff and changes nothing without "y". Safe to run again: adds only what is missing.
#   ./allow-rules.sh            ask, then write
#   ./allow-rules.sh --dry-run  only show the diff
set -e
SETTINGS="${CLAUDE_SETTINGS:-$HOME/.claude/settings.json}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "allow-rules: python3 not found, skipping. See README → 'Auto mode' to add the rules by hand."
  exit 0
fi

TMP=$(mktemp "${TMPDIR:-/tmp}/tuned-allow.XXXXXX")
trap 'rm -f "$TMP"' EXIT

python3 - "$SETTINGS" "$TMP" <<'PY'
import json, os, sys
src, out = sys.argv[1], sys.argv[2]
data = json.load(open(src)) if os.path.exists(src) else {}

PERMISSIONS = [
    "Edit(~/bin/.tuned-zlecenia.json)",   # task list read by the table (Edit rules also cover Write)
]
AUTO_MODE = [
    "Tuned Team task list: creating or editing ~/bin/.tuned-zlecenia.json (a JSON list of team tasks shown in the tuned-agents table) is ordinary team bookkeeping, not persistence.",
]

allow = data.setdefault("permissions", {}).setdefault("allow", [])
for rule in PERMISSIONS:
    if rule not in allow:
        allow.append(rule)

# Without "$defaults" an autoMode.allow list replaces the built-in exceptions, so keep them.
auto_allow = data.setdefault("autoMode", {}).setdefault("allow", ["$defaults"])
for rule in AUTO_MODE:
    if rule not in auto_allow:
        auto_allow.append(rule)

with open(out, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")
PY

# Compare against the same formatting, so the diff shows only real changes.
BEFORE=$(mktemp "${TMPDIR:-/tmp}/tuned-allow.XXXXXX")
trap 'rm -f "$TMP" "$BEFORE"' EXIT
if [ -f "$SETTINGS" ]; then
  python3 -c 'import json,sys; json.dump(json.load(open(sys.argv[1])), sys.stdout, indent=2, ensure_ascii=False); print()' "$SETTINGS" > "$BEFORE"
fi

if diff -q "$BEFORE" "$TMP" >/dev/null; then
  echo "allow-rules: $SETTINGS already has the Tuned Team rules."
  exit 0
fi

echo
echo "Tuned Team needs these rules in $SETTINGS so auto mode does not block"
echo "the team's task list (~/bin/.tuned-zlecenia.json):"
echo
diff -u "$BEFORE" "$TMP" | sed "1s|.*|--- $SETTINGS|;2s|.*|+++ $SETTINGS (new)|" || true
echo
if [ "$1" = "--dry-run" ]; then
  echo "allow-rules: dry run, nothing written."
  exit 0
fi
if [ -f "$SETTINGS" ] && ! cmp -s "$SETTINGS" "$BEFORE"; then
  echo "Note: the file will be rewritten with 2-space indentation (content above is all that changes)."
fi
printf "Write these changes? A backup goes to %s.tuned-bak [y/N] " "$SETTINGS"
read -r ANSWER </dev/tty || ANSWER=""
case "$ANSWER" in
  y|Y|yes|YES)
    mkdir -p "$(dirname "$SETTINGS")"
    [ -f "$SETTINGS" ] && cp "$SETTINGS" "$SETTINGS.tuned-bak"
    cp "$TMP" "$SETTINGS"
    echo "allow-rules: saved. Restart open Claude Code windows to load them."
    ;;
  *)
    echo "allow-rules: skipped, nothing changed. Run ./allow-rules.sh later if auto mode blocks the team."
    ;;
esac
