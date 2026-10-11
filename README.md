# Tuned Team

Rozszerzenie VS Code, które otwiera zespół agentów Claude Code w jednym oknie. Każdy agent ma swój terminal, kolor i rolę:

- **#0 kierownik** rozmawia z Tobą i rozdziela zadania,
- **#1 prawa ręka** pilnuje stanu zespołu i porządków,
- **#2, #3… koledzy** robią zadania, każdy na własnym branchu.

## Wymagania

- macOS albo Linux (w Windows tylko przez WSL).
- VS Code 1.90 lub nowszy. Powinno działać też w Cursorze, Windsurfie i VSCodium, ale tego nie testowałem.
- Zainstalowany [Claude Code](https://claude.com/claude-code) (polecenie `claude` w terminalu) i zalogowane konto.
- `perl` (jest w macOS i w większości Linuksów).

Nie zadziała w PhpStormie ani w innych IDE od JetBrains.

## Instalacja

```sh
git clone git@github.com:zdzislawbela/tuned-team.git
cd tuned-team
./install.sh            # VS Code
./install.sh cursor     # Cursor (analogicznie: windsurf, codium)
```

Jeśli skrypt nie widzi polecenia `code`: w VS Code wciśnij Cmd+Shift+P (Ctrl+Shift+P w Linuksie) i wybierz „Shell Command: Install 'code' command in PATH”, potem uruchom ponownie terminal.

Bez skryptu: Cmd+Shift+P → „Extensions: Install from VSIX…” i wskaż plik z `dist/`.

Po instalacji przeładuj okno (Cmd+Shift+P → „Developer: Reload Window”).

## Użycie

Otwórz folder projektu, potem Cmd+Shift+P:

| Polecenie | Co robi |
|---|---|
| Tuned Team: start | pyta, ilu kolegów, i otwiera zespół |
| Tuned Team: dodaj kolegę | dokłada jeszcze jednego kolegę po prawej |
| Tuned Team: podpisz karty numerami | nadaje kartom nazwy z numerem i kolorem |

Kierownik startuje sam z komunikatem „start” i pyta Ciebie, co robimy.

### Skrót w terminalu (opcjonalnie)

Dodaj do `~/.zshrc`:

```sh
tuned-team() { open "vscode://zbela.tuned-team/team?n=${1:-2}"; }
```

`tuned-team 4` otworzy kierownika, prawą rękę i czterech kolegów. W Cursorze zamień `vscode://` na `cursor://`, w Windsurfie na `windsurf://`. W Linuksie zamiast `open` użyj `xdg-open`.

## Własne role

Role to zwykłe pliki Markdown: `kierownik.md`, `prawa-reka.md`, `kolega.md`. Rozszerzenie bierze je z `~/.tuned-team/roles/` i dopiero gdy ich tam nie ma, używa wbudowanych z `defaults/roles/`.

```sh
mkdir -p ~/.tuned-team/roles
cp defaults/roles/*.md ~/.tuned-team/roles/
```

Zmieniasz tam pliki i otwierasz zespół od nowa. W tekście roli możesz użyć dwóch znaczników: `{{ROLES}}` (folder z rolami, np. do „Zasady: {{ROLES}}/kolega.md”) i `{{ADD_URL}}` (adres, którym kierownik dokłada kolegę).

## Aktualizacja i odinstalowanie

Aktualizacja: `git pull && ./install.sh`. Odinstalowanie: Extensions → Tuned Team → Uninstall. Własne role w `~/.tuned-team/` zostają.

## Dla autora: nowa wersja

```sh
npx --yes @vscode/vsce package --allow-missing-repository --skip-license -o dist/tuned-team-<wersja>.vsix
```

Podbij `version` w `package.json` przed budowaniem i dołącz nowy plik z `dist/` do commita.
