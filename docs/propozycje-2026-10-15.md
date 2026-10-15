# Propozycje usprawnień tuned-team (2026-10-15)

Źródło: docs/todo.md w zgrani („Usprawnić wtyczkę tuned-team”), karty L39 i
N-tt-english-names, stan repo wtyczki 2026-10-15, `tuned-agents`.
Kod jeszcze niezmieniony. Koszt: S = do 1 h, M = 1–3 h, L = pół dnia+.

## Stan dziś

- Wydana wtyczka: 0.1.18. N-tt-english-names zrobione (a7d3d02).
- Na `main` w głównym checkoucie: 1 commit przed origin i niezacommitowane
  zmiany (okno „Standby” z ikonami w `extension.js`, `bin/tuned-team`).
  Nie moje, nie ruszałem.
- Niescalone branche (każdy ma własny worktree w `~/tools/`):
  - `team-rules-in-plugin` (1 commit, 4 za main): wspólny `team.md` przed
    każdą rolą + `procedures.md` czytany na żądanie.
  - `feat/run-block-voice` (1), `feat/question-queue` (2),
    `feat/context-color-bottom` (2), `feat/tuned-team-next` (4 = połączenie
    trzech poprzednich).
  - Do usunięcia (0 przed main, już scalone): `english-command-names`,
    `feat/auto-mode-allow-rules`, `remote-clear`, `repo-scope`,
    `restart-by-manager` + ich worktree.
- Pamięć zgrani: 107 plików, `MEMORY.md` 15,7 kB (~4k tokenów na każdym
  starcie). Ok. 40 wpisów dotyczy zespołu (role, clear, raporty, stany nocy
  z 13–15.10), duża część powtarza to, co już jest w rolach wtyczki.
- Start sesji wg todo: ok. 44k tokenów (narzędzia 14,5k, skille 9,9k,
  pamięć 7,7k).
- Pamięć w worktree: worktree w innym katalogu (np.
  `zgrani/.claude/worktrees/sala`) dostaje osobny katalog projektu w
  `~/.claude/projects` bez `memory/`. Wniosek ostrożny: sesja uruchomiona
  w worktree prawdopodobnie NIE widzi pamięci głównego repo. Koledzy
  startują w głównym checkoucie i dopiero potem przechodzą do worktree,
  więc ich to dziś nie dotyczy. Do potwierdzenia jednym testem.

## Propozycje

### 1. Posprzątać branche i scalić to, co gotowe
Scalić `team-rules-in-plugin` (po rebase na main) oraz `feat/tuned-team-next`
(zawiera run-block-voice, question-queue, context-color-bottom), usunąć 5
scalonych branchy i 7 worktree.
- Koszt: S–M (rebase `team-rules-in-plugin` może mieć konflikty w rolach).
- Zysk: jeden stan wtyczki zamiast 6 rozjechanych; reszta propozycji
  buduje na czystym main. Warunek: właściciel najpierw zacommituje albo
  odrzuci zmiany „Standby” leżące na main.

### 2. Wspólny `team.md` jako jedyne źródło zasad zespołu (todo pkt 1)
Dokończyć to, co zaczyna `team-rules-in-plugin`: zasady wspólne w jednym
pliku, role tylko z własnymi obowiązkami, rzadkie procedury w
`procedures.md`.
- Koszt: S (praca jest już na branchu).
- Zysk: role krótsze o ~30%, mniej sprzeczności między rolami; podstawa
  do sprzątania pamięci (pkt 3).

### 3. Odchudzić pamięć: z ~40 wpisów o zespole zostają 2
Zostają: „kim jestem w zespole” i „zasady pracy współdzielonej” (commity
tylko swoich plików, limity laptopa). Reszta: to, co jest w rolach, usunąć;
stany nocy i jednorazowe zgody (`deputy-night-*`, `team-state-*`,
`push-consent-2026-10-14`, `manager-handover-*`, `day-end-*`) usunąć jako
nieaktualne; zdublowane pary (`kanban-in-progress-is-order` /
`kanban-doing-is-order`, `board-clears-colleagues` /
`management-clears-colleagues`) scalić albo usunąć.
- Koszt: S–M. Usuwanie wpisów pamięci wymaga „tak” właściciela — dam
  listę do zatwierdzenia przed usunięciem.
- Zysk: `MEMORY.md` z ~15,7 kB do ~9 kB (≈ −1,7k tokenów na każdym
  starcie każdego okna; przy 10 oknach i kilku restartach dziennie to
  setki tysięcy tokenów); koniec sprzecznych wpisów (np. 30/35% vs 20%).

### 4. Agent obok zespołu wie, że nie jest sam (todo pkt 2)
Hook `SessionStart` we wtyczce: jeśli w `~/.claude/sessions` żyją okna
zespołu z tego samego repo, dopisuje do kontekstu 5 linii (kierownik,
zastępca, koledzy, limit okien, progi kontekstu, „zadania przekaż
kierownikowi”). Okna samego zespołu już to mają w rolach.
- Koszt: M.
- Zysk: sesja spoza zespołu nie wchodzi w cudze pliki ani na main, bez
  trzymania tego w pamięci każdego repo.

### 5. `tuned-agents` filtruje po repo
Tabela pokazuje dziś sesje ze wszystkich repo (wpis pamięci
`team-is-this-repo-only` łata to ręcznie). Filtr po `cwd` z
`~/.claude/sessions/*.json` = repo zespołu (z worktree włącznie),
przełącznik `--all`.
- Koszt: S.
- Zysk: zastępca nie przydziela zadań oknom innego projektu; jeden wpis
  pamięci mniej.

### 6. Lżejszy start okna (todo pkt 3)
Okna zespołu startują z ustawieniami per rola: koledzy bez nieużywanych
serwerów MCP (Figma, Vercel, Docker, Claude Docs — kilka tys. tokenów
samych nazw i instrukcji) i bez zbędnych skilli (np. vercel:*, webflow).
Przez `--mcp-config`/`--strict-mcp-config` i `disabledMcpServers` w
ustawieniach sesji; lista per rola w `defaults/`.
- Koszt: M. Niepewne: dokładny zysk trzeba zmierzyć (`/context` przed i
  po); część skilli pochodzi z wtyczek użytkownika i może wymagać ich
  wyłączenia per projekt.
- Zysk: szacunkowo 10–20k tokenów mniej na start okna (z 44k).

### 7. Sprawdzić i naprawić pamięć w worktree
Jeden test: sesja uruchomiona w `zgrani/.claude/worktrees/x` → czy widzi
wpisy. Jeśli nie: rola kolegi mówi „startuj w głównym checkoucie, potem
`cd` do worktree” (dziś tak jest de facto) albo wtyczka linkuje `memory/`.
- Koszt: S.
- Zysk: pewność zamiast założenia; brak „ślepych” okien.

### 8. `tuned-team doctor`
Jedna komenda: wersja wtyczki vs repo, niescalone branche i osierocone
worktree w repo wtyczki, aliasy w `~/bin`, reguła auto-mode dla
`.tuned-zlecenia.json`, rozmiar `MEMORY.md`.
- Koszt: M.
- Zysk: dzisiejszy bałagan (7 worktree, zmiany na main) widać od razu;
  mniej pytań do właściciela.

### 9. Krótkie testy skryptów
Smoke test dla `tuned-agents` / `tuned-report` / `tuned-the-end` na
sztucznym `~/.claude/sessions` (katalog tymczasowy) + `node --check
extension.js`, uruchamiane przez `install.sh` przed budową .vsix.
- Koszt: M.
- Zysk: wtyczka jest w użyciu przez cały zespół; błąd w `tuned-agents`
  zatrzymuje zastępcę. Dziś bramki jakości nie ma.

## Rekomendowana kolejność

1. **Pkt 1 + 2** (sprzątanie branchy, `team.md`) — fundament, tanio.
2. **Pkt 5** (filtr repo) — najtańszy realny zysk.
3. **Pkt 3** (pamięć) — po 2, bo usuwamy wpisy dopiero, gdy zasady są w
   rolach; lista do „tak” właściciela.
4. **Pkt 7** (test worktree) — 15 minut, rozstrzyga pkt 4.
5. **Pkt 6** (lżejszy start) — największy zysk tokenów, ale trzeba mierzyć.
6. **Pkt 4, 9, 8** — gdy reszta stoi.

Wdrażanie: każdy punkt na własnym branchu, wydanie wtyczki (nowa wersja
.vsix) tylko po zgodzie właściciela i przy restarcie zespołu, nie w trakcie
pracy okien.

## Stan po pierwszej partii (2026-10-15 wieczór)

- Pkt 5 (filtr repo w `tuned-agents`): scalone na lokalny main (8a3d021),
  działa na żywo (link `~/bin/tuned-agents`).
- Pkt 2 (`team.md`): gotowe na branchu `feat/team-md` (5a60b52), zrobione
  od nowa z ról 0.1.18 (stary `team-rules-in-plugin` zgubiłby nowsze
  zasady, do usunięcia razem z resztą branchy). Nie scalone: zmienia
  `extension.js`, a na main leży niezacommitowana zmiana „Standby”
  (czeka na decyzję właściciela, czyja jest). Działa dopiero po nowym
  .vsix i instalacji (za „tak” właściciela).
- Kolizja: `feat/tuned-team-next` dopisuje linie do `deputy.md` i
  `manager.md`, z których `feat/team-md` usuwa powtórzone zasady. Kto
  scala drugi, rozwiązuje konflikt ręcznie: nowe linie zostają w roli,
  zasady wspólne tylko w `team.md`.
