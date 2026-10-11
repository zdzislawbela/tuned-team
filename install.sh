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

# The publisher was "zbela" up to 0.1.10; remove that copy so there are not two.
"$CLI" --uninstall-extension zbela.tuned-team >/dev/null 2>&1 || true
"$CLI" --install-extension "$VSIX" --force
echo
echo "Done. Reload the editor window, then: Ctrl/Cmd+Shift+P → 'Tuned Team: start'."
