#!/bin/sh
# Installs Tuned Team in an editor: ./install.sh [code|cursor|windsurf|codium]
set -e
cd "$(dirname "$0")"
CLI="${1:-code}"
VSIX=$(ls dist/tuned-team-*.vsix | sort | tail -1)

if ! command -v "$CLI" >/dev/null 2>&1; then
  echo "Command '$CLI' not found."
  echo "In VS Code: Ctrl/Cmd+Shift+P → 'Shell Command: Install code command in PATH', then restart the terminal."
  exit 1
fi
command -v claude >/dev/null 2>&1 || echo "Warning: no 'claude' command. Install Claude Code, the team will not start without it."

# The publisher was "zbela" up to 0.1.10, and the very first version was zbela.tuned-layout;
# remove those copies so old roles and URLs do not come back.
"$CLI" --uninstall-extension zbela.tuned-team >/dev/null 2>&1 || true
"$CLI" --uninstall-extension zbela.tuned-layout >/dev/null 2>&1 || true
"$CLI" --install-extension "$VSIX" --force

# Team helpers (table, reports, READY TO CLEAR, status line) as links in ~/bin,
# so `git pull` updates them. An existing file of the same name is kept as .bak.
mkdir -p "$HOME/bin"
for f in bin/*; do
  dst="$HOME/bin/$(basename "$f")"
  [ -e "$dst" ] && [ ! -L "$dst" ] && mv "$dst" "$dst.bak"
  ln -sf "$PWD/$f" "$dst"
done
case ":$PATH:" in *":$HOME/bin:"*) ;; *) echo "Add ~/bin to PATH (e.g. in ~/.zshrc: export PATH=\"\$HOME/bin:\$PATH\"), the team calls these helpers by name." ;; esac
command -v jq >/dev/null 2>&1 || echo "Warning: no 'jq' command. tuned-daj-clear and the status line need it."
grep -q tuned-statusline "$HOME/.claude/settings.json" 2>/dev/null || echo "Optional status line: add to ~/.claude/settings.json: \"statusLine\": {\"type\": \"command\", \"command\": \"~/bin/tuned-statusline.sh\"}"

# Auto mode: a rule for the team's task list. Shows the diff and asks first.
./allow-rules.sh || echo "allow-rules failed; run ./allow-rules.sh by hand later."
echo
echo "Done. Reload the editor window, then: Ctrl/Cmd+Shift+P → 'Tuned Team: start'."
