#!/bin/sh
# Instaluje Tuned Team w edytorze: ./install.sh [code|cursor|windsurf|codium]
set -e
cd "$(dirname "$0")"
CLI="${1:-code}"
VSIX=$(ls dist/tuned-team-*.vsix | sort | tail -1)

if ! command -v "$CLI" >/dev/null 2>&1; then
  echo "Nie znaleziono polecenia '$CLI'."
  echo "W VS Code: Ctrl/Cmd+Shift+P → 'Shell Command: Install code command in PATH', potem uruchom ponownie."
  exit 1
fi
command -v claude >/dev/null 2>&1 || echo "Uwaga: nie ma polecenia 'claude'. Zainstaluj Claude Code, bez niego zespół się nie uruchomi."

"$CLI" --install-extension "$VSIX" --force
echo
echo "Gotowe. Przeładuj okno edytora, potem: Ctrl/Cmd+Shift+P → 'Tuned Team: start'."
