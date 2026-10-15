# Pamięć zgrani: lista do odchudzenia (2026-10-15)

Do propozycji „Odchudzić pamięć: z ~40 wpisów o zespole zostają 2”
(`docs/propozycje-2026-10-15.md`, pkt 3). Tylko lista: w pamięci nic nie
zostało usunięte ani zmienione. Usuwanie po „tak” właściciela.

Pamięć: `~/.claude/projects/-Users-zdzislaw-bela-repos-priv-zgrani/memory/`.
Lista obejmuje 51 wpisów o zespole, gicie i wydaniach. Wpisy o produkcie
(pytania, radio, help, brand, języki, klienci itd.) są poza zakresem i
zostają bez zmian.

Skróty celu:
- **team.md** = `defaults/roles/team.md` z brancha `feat/team-md` (5a60b52,
  zbudowany od nowa z ról 0.1.18; jeszcze nie na main wtyczki). Ma 5 zasad:
  jeden kierownik, pisz tylko do okien zespołu, tryb kontroli, blokady
  uprawnień, prawdziwe okno kontekstu (1M).
- **procedures.md** nie ma w `feat/team-md` (był tylko na starym
  `team-rules-in-plugin`), więc nic tam nie odsyłam; to, co miało tam iść,
  jest w sekcji „przenieść do wtyczki”.
- **rola** = `defaults/roles/{manager,deputy,colleague}.md` w `feat/team-md`.
- **AGENTS.md / docs** = repo zgrani (tylko rzeczy nieprywatne).
- **tryb** = tryb kontroli „I DECIDE ALL” doklejany przez wtyczkę.

Warunek: wpisy z sekcji „już w roli lub w team.md” usuwamy dopiero, gdy
`feat/team-md` jest scalony i zainstalowany (.vsix). Wpisy z sekcji
„przenieść do wtyczki” dopiero, gdy ich treść trafi do team.md albo roli.
Do tego czasu zasady są tylko w pamięci. Sprawdzone na `feat/team-md`
5a60b52.

## Zostają 2 wpisy (nowe, scalone ze starych)

1. **`team-who-i-am`** (kim jestem w zespole), ok. 6 linii:
   - Zespół Tuned Team = sesje z `cwd` w `~/repos/priv/zgrani` (i jego
     worktree); sesje z innych repo (showroom, centracom) to nie my.
   - Zasady, role i progi kontekstu są w roli wtyczki (team.md + rola);
     przy konflikcie notatki z rolą wygrywa rola.
   - Sesja spoza zespołu, która dostaje zadanie od właściciela, przekazuje
     je kierownikowi.
   - Miejsca właściciela (prywatne, nie do repo): Tuned Todo (kanban +
     „Pytania do Ciebie”), Decyzje Tuned, Akta Tuned: linki do artefaktów.
   - Gdy okno jest kierownikiem: tag `<czytaj>` tylko u kierownika i tylko
     przy pytaniu albo blokadzie (aż przejdzie do wtyczki, patrz niżej).
   - Źródła: `agents-status-summary`, `team-is-this-repo-only`,
     `single-manager-rule`, `owner-questions-in-todo-box`,
     `decisions-as-artifact`, `voice-czytaj-tag`, `voice-only-questions`.

2. **`shared-checkout-rules`** (zasady pracy współdzielonej), ok. 6 linii,
   dotyczy też pojedynczych sesji poza zespołem:
   - Commit tylko swoich ścieżek (`git commit -- <pliki>`), nowy plik
     najpierw `git add <plik>`, nigdy `--amend` ani stash/reset/checkout
     cudzych plików w głównym checkoucie.
   - Gotowe i zielone od razu na lokalny `main` (`merge-to-main.sh`), bez
     parkowania brancha; push tylko na słowo właściciela (tryb).
   - Laptop: najwyżej 2 `npm run check` naraz (`pgrep` przed), najwyżej 4
     `next dev`, Chromium tylko headless i zamknięty po teście.
   - Źródła: `parallel-agents-git-commits`, `merge-ready-to-main`,
     `no-waiting-branches`, `batch-pushes`, `laptop-load-limits`,
     `playwright-headless-only`.

## Znikają: już w roli lub w team.md

- `kolega-asks-prawa-reka` — rola colleague: zadania tylko od zastępcy, pytania do zastępcy.
- `tasks-only-via-prawa-reka` — duplikat poprzedniego; rola colleague.
- `owner-talks-only-to-kierownik` — rola manager („owner gives tasks only to you”) + team.md (jeden kierownik).
- `single-manager-rule` — team.md (pierwsza zasada); sedno w wpisie 1.
- `prawa-reka-coordinate-tasks` — rola deputy (zadania tylko od kierownika, nic z todo).
- `kierownik-no-self-assigned-tasks` — rola manager („Give only tasks the owner asked for”).
- `clear-thresholds` — rola colleague (przy 30% stan do zastępcy); progu 35% już nie ma; stare nazwy `tuned-daj-clear`, CHCE/DAJ.
- `context-window-1m` — team.md („Opus = 1M tokens, so 30% ≈ 300k”).
- `board-clear-at-20` — rola manager (20%) i deputy (10%).
- `management-clears-colleagues` — duplikat `board-clears-colleagues`; rola manager (Cull).
- `board-clears-colleagues` — rola manager/deputy (Cull) + colleague (READY TO CLEAR po każdym zadaniu).
- `manager-clears-windows` — rola manager: `open "vscode://tuned.tuned-team/restart?nr=N"`.
- `deputy-is-throughput` — rola deputy („You are throughput”).
- `one-branch-one-feature` — rola colleague („One branch = one feature”).
- `merge-ready-to-main` — rola colleague („Green: merge right away”); sedno w wpisie 2.
- `no-waiting-branches` — duplikat `merge-ready-to-main`; sedno w wpisie 2.
- `manager-short-replies` — do roli manager (krótko, „OK”, „Mam pytanie”); reszta nieaktualna (artefakt „Todo dzisiaj” → Tuned Todo, prośba „wyczyść kolegę” → kierownik restartuje sam).
- `decisions-as-artifact` — rola manager (karty decyzji); link do „Decyzje Tuned” w wpisie 1.
- `team-is-this-repo-only` — propozycja pkt 5 (`tuned-agents` filtruje po repo); do tego czasu sedno w wpisie 1.

## Znikają: przenieść do wtyczki (nie ma ich w `feat/team-md`)

- `commands-without-bang` — do team.md (blok `▶▶▶ RUN ▶▶▶` dla komend właściciela, bez `!`); dotyczy też sesji spoza zespołu, więc do tego czasu zostaje.
- `laptop-load-limits` — do team.md jako „wspólna maszyna” (najwyżej 2 ciężkie checki, `pgrep` przed, mało dev serwerów); sedno w wpisie 2.
- `playwright-headless-only` — do team.md razem z powyższym (przeglądarka tylko headless, zamknięta po teście); sedno w wpisie 2.

- `voice-czytaj-tag` — do roli manager (tag tylko u kierownika, słownik wymowy); inne role: „nigdy `<czytaj>`”. Do tego czasu w wpisie 1.
- `voice-only-questions` — do roli manager razem z powyższym.
- `kanban-in-progress-is-order` — do roli deputy jako ogólne „karta w W toku bez `by` = zlecenie” (link do Tuned Todo zostaje w pamięci, wpis 1).
- `kanban-doing-is-order` — duplikat poprzedniego (ten sam dzień, ta sama treść).
- `deputy-window-mapping` — do roli deputy, bo procedures.md nie ma (dwa okna pod jednym numerem → `ps -o lstart` po pid socketu).
- `tuned-team-setup` — historia budowy wtyczki; aktualne rzeczy są w README wtyczki; stare nazwy (`tuned-layout`, `zbela.*`, `tuned-agenci`).
- `no-github-org-team-plugin` — decyzja o wtyczce do README wtyczki („Why one plugin”); w pamięci zbędna.
- `team-size-8` — do kreatora wtyczki / README (domyślnie do 8 kolegów); weryfikacja przed merge jest już w roli.

## Znikają: do repo zgrani (AGENTS.md / docs, nic prywatnego)

- `main-via-local-main` — już w AGENTS.md („Git: na origin/main tylko przez lokalny main”).
- `parallel-agents-git-commits` — sedno już w AGENTS.md („commituj tylko swoje ścieżki”); reszta w wpisie 2.
- `release-flow` — zasady changelogu do `docs/prowadzenie-serwisu.md` (sekcja o release); „release bez pytania” nieaktualne wobec trybu I DECIDE ALL.
- `useroom-split-freeze` — stan podziału i zakaz zadań w `useRoom.ts`/`GameApp.tsx` do karty w `docs/todo.md` (tam już jest „Podział useRoom – w toku”); po podziale usunąć.
- `tuna-means-release` — jedna linia do `docs/prowadzenie-serwisu.md` („tuna” = release); albo zostaje, bo to słówko właściciela (do decyzji).

## Znikają: nieaktualne (jednorazowe stany i zgody)

- `push-consent-2026-10-14` — zgoda tylko na 14.10, wygasła.
- `team-state-2026-10-13` — stan nocy 14.10 (~23:30); sprawy właściciela są dziś na Tuned Todo / Decyzje Tuned.
- `deputy-night-2026-10-15` — stan przed restartem ~00:50, stare pid-y.
- `deputy-night-plan-2026-10-15` — plan nocy do 9:00, crony już wygasły.
- `manager-handover-2026-10-15` — przekazanie z ~01:00; 0.1.193 już wypchnięte (0.1.194 w `day-end`).
- `day-end-2026-10-15` — zamknięcie dnia; otwarte sprawy są w Decyzjach Tuned (karta „stare branche”).
- `prawa-reka-handover` — stan z 11.10, stare nazwy sesji i reguła release co godzinę.
- `agents-on-sonnet` — 11.10 okna na Sonnecie; dziś zespół na Opusie (`opus-default-model`), sprzeczne.
- `push-after-stage` — etapy handoffu i push po etapie zastąpione trybem; jeśli handoff wraca, zostawić tylko linię „paczka w `~/Downloads/design_handoff_tuned N`, nie w repo”.
- `batch-pushes` — historia zasad pushowania; obowiązuje tryb I DECIDE ALL; sedno („push tylko na słowo właściciela”) w wpisie 2.
- `implement-without-asking` — część o zespole (merge + push bez pytania) sprzeczna z trybem; część „nie pytaj o decyzje, Jev gdy rozdarty” to zasada produktowa, poza zakresem (zostaje, do skrócenia).

## Zostają bez zmian (zespołowe, ale prywatne albo produktowe)

- `agent-performance-page` — metoda pomiaru i link do strony w Akta; prywatne, potrzebne do re-pomiaru.
- `token-analysis-consent` — zgoda właściciela na analizę transkryptów; prywatne, nie do repo.
- `status-bullets-at-end` — dotyczy każdej sesji, nie tylko zespołu.
- `safe-means-go` — dotyczy każdej sesji; nie stoi w sprzeczności z trybem (push i tak czeka).

## Efekt

- Wpisy o zespole/gicie: 51 → 2 nowe + 4 bez zmian (+ `implement-without-asking`
  skrócony). Usunięte: do 46 (`tuna-means-release` i `commands-without-bang` warunkowo).
- `MEMORY.md`: szacunkowo −45 linii (z ok. 95), ok. −6 kB; sprzeczności
  znikają (30/35% vs 20%, push co godzinę vs I DECIDE ALL, Sonnet vs Opus,
  dwie wersje „kanban = zlecenie”, dwie wersje „zarząd czyści kolegów”).
- Kolejność: 1) scalić `feat/team-md` i zainstalować .vsix, 2) dopisać do
  wtyczki to, co trzeba, z sekcji „przenieść do wtyczki”, 3) „tak” właściciela,
  4) napisać 2 nowe wpisy, usunąć resztę i ich linie w `MEMORY.md`,
  poprawić linki `[[...]]` w wpisach, które zostają.
