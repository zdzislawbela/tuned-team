#!/bin/sh
# Installs Tuned Team in an editor: ./install.sh [code|cursor|windsurf|codium]
set -e
cd "$(dirname "$0")"
CLI="${1:-code}"
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' package.json | head -1)

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

# Build the .vsix from this folder (plain zip, no Node or vsce) and install it.
# Remove links left by 0.1.12's install.sh first, they would clash with the install.
for old in "$HOME"/.vscode/extensions/tuned.tuned-team-* "$HOME"/.cursor/extensions/tuned.tuned-team-* \
           "$HOME"/.windsurf/extensions/tuned.tuned-team-* "$HOME"/.vscode-oss/extensions/tuned.tuned-team-*; do
  if [ -L "$old" ]; then rm "$old"; fi
done
BUILD=$(mktemp -d)
trap 'rm -rf "$BUILD"' EXIT
mkdir -p "$BUILD/extension"
cp -R package.json extension.js README.md defaults "$BUILD/extension/"
cat > "$BUILD/[Content_Types].xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension=".json" ContentType="application/json"/><Default Extension=".js" ContentType="application/javascript"/><Default Extension=".md" ContentType="text/markdown"/><Default Extension=".vsixmanifest" ContentType="text/xml"/></Types>
XML
cat > "$BUILD/extension.vsixmanifest" <<XML
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="tuned-team" Version="$VERSION" Publisher="tuned"/>
    <DisplayName>Tuned Team</DisplayName>
    <Description xml:space="preserve">A team of Claude Code agents in one window</Description>
  </Metadata>
  <Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation>
  <Dependencies/>
  <Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/></Assets>
</PackageManifest>
XML
VSIX="$BUILD/tuned-team-$VERSION.vsix"
(cd "$BUILD" && zip -qr "$VSIX" "[Content_Types].xml" extension.vsixmanifest extension)
"$CLI" --install-extension "$VSIX" --force

# Team helpers (table, reports, READY TO CLEAR, status line) as links in ~/bin,
# with the old Polish names (tuned-agenci, tuned-meldunek, tuned-daj-clear) kept as aliases,
# so `git pull` updates them. An existing file of the same name is kept as .bak.
mkdir -p "$HOME/bin"
for f in bin/*; do
  dst="$HOME/bin/$(basename "$f")"
  [ -e "$dst" ] && [ ! -L "$dst" ] && mv "$dst" "$dst.bak"
  ln -sf "$PWD/$f" "$dst"
done
case ":$PATH:" in *":$HOME/bin:"*) ;; *) echo "Add ~/bin to PATH (e.g. in ~/.zshrc: export PATH=\"\$HOME/bin:\$PATH\"), the team calls these helpers by name." ;; esac
command -v jq >/dev/null 2>&1 || echo "Warning: no 'jq' command. tuned-ready-to-clear and the status line need it."
grep -q tuned-statusline "$HOME/.claude/settings.json" 2>/dev/null || echo "Optional status line: add to ~/.claude/settings.json: \"statusLine\": {\"type\": \"command\", \"command\": \"~/bin/tuned-statusline.sh\"}"

# Auto mode: a rule for the team's task list. Shows the diff and asks first.
./allow-rules.sh || echo "allow-rules failed; run ./allow-rules.sh by hand later."
echo
echo "Done. Reload the editor window, then: Ctrl/Cmd+Shift+P → 'Tuned Team: start'."
