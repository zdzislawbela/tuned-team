// Tuned Team: zespół agentów Claude Code w jednym oknie edytora.
// 0-kierownik, 1-prawa-reka i N kolegów, każdy w swojej grupie edytora,
// z rolą z pliku .md (--append-system-prompt). Role: ~/.tuned-team/roles/<rola>.md
// (własne) albo defaults/roles/<rola>.md z tego rozszerzenia.
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const os = require("os");

const EXT_ID = "zbela.tuned-team";
const ROWS = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const quote = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;

let extensionPath = "";

// Własna rola z ~/.tuned-team/roles ma pierwszeństwo przed wbudowaną.
function roleFile(role) {
  const own = path.join(os.homedir(), ".tuned-team", "roles", `${role}.md`);
  return fs.existsSync(own) ? own : path.join(extensionPath, "defaults", "roles", `${role}.md`);
}

// Każdy kolega ma swój kolor tła z colors.json; spoza palety: golden angle
// po numerze. OSC 11 ustawia tło terminala.
function tintHex(nr) {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(extensionPath, "colors.json"), "utf8"))[nr];
    if (c) return c[1];
  } catch {}
  const h = (nr * 137.5) % 360, s = 0.4, l = 0.12;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
const tintSeq = (nr) => `\\033]11;${tintHex(nr)}\\007`;

const dotOf = (nr) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(extensionPath, "colors.json"), "utf8"))[nr]?.[0] || "";
  } catch {
    return "";
  }
};

// Szary baner w oknie kierownika, drukowany tuż przed startem claude.
const BANNER = "TUNED TEAM · GOTOWE";
const bannerSeq = `\\033[48;5;240m\\033[38;5;255m\\033[1m  ${BANNER}  \\033[0m\\n`;

const cwdOf = () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

// One member: a terminal named like the session, claude with its role.
// Miejsca {{ROLES}} i {{ADD_URL}} w pliku roli podmienia perl (zmienne
// środowiskowe, więc ścieżki ze spacjami i apostrofami są bezpieczne).
function member(nr, role, viewColumn, cwd, opts = session) {
  const name = nr === 0 ? "0-kierownik" : nr === 1 ? "1-prawa-reka" : `${nr}-kolega`;
  const label = `#${nr} ${role}`;
  const t = vscode.window.createTerminal({ name: `${dotOf(nr)} ${label}`.trim(), cwd, location: { viewColumn, preserveFocus: true } });
  // Kierownik i prawa ręka zawsze na Opusie, model z kreatora dotyczy kolegów.
  const chosen = nr <= 1 ? "opus" : opts.model;
  const model = chosen ? ` --model ${quote(chosen)}` : "";
  const start = nr === 0 ? ` ${quote(startMessage(opts))}` : "";
  const roles = path.dirname(roleFile("kolega"));
  const addUrl = `${vscode.env.uriScheme}://${EXT_ID}/add`;
  const prompt =
    `"$(TT_ROLES=${quote(roles)} TT_ADD=${quote(addUrl)} ` +
    `perl -pe 's/\\{\\{ROLES\\}\\}/$ENV{TT_ROLES}/g; s/\\{\\{ADD_URL\\}\\}/$ENV{TT_ADD}/g' ${quote(roleFile(role))})"`;
  const banner = nr === 0 ? `printf '${bannerSeq}'; ` : "";
  t.sendText(`printf '${tintSeq(nr)}'; ${banner}claude -n ${name}${model} --append-system-prompt ${prompt}${start}`);
  return t;
}

// Ustawienia z kreatora; używa ich też "dodaj kolegę" w tym samym oknie edytora.
let session = {};

// Pierwsza wiadomość kierownika: "start" plus to, co powiedziałeś w kreatorze.
function startMessage(opts) {
  let msg = "start";
  if (opts.sizeLabel) msg += `. Rozmiar pracy: ${opts.sizeLabel}. Kolegów: ${opts.n}.`;
  if (opts.cron) msg += ` Od razu ustaw zadanie cykliczne: ${opts.cron}`;
  return msg;
}

// Numbers already open in this window (terminals are named "#N role").
function taken() {
  return vscode.window.terminals.map((t) => /#(\d+) /.exec(t.name)).filter(Boolean).map((m) => Number(m[1]));
}

function supported() {
  if (process.platform === "win32") {
    vscode.window.showErrorMessage("Tuned Team działa na macOS i Linuksie. W Windows uruchom VS Code przez WSL.");
    return false;
  }
  return true;
}

async function team(n, opts = {}) {
  if (!supported()) return;
  session = { ...opts, n };
  const cwd = cwdOf();
  const total = n + 2;
  const cols = Math.ceil(total / ROWS);
  await vscode.commands.executeCommand("vscode.setEditorLayout", {
    orientation: 1,
    groups: Array.from({ length: ROWS }, () => ({ groups: Array.from({ length: cols }, () => ({})) })),
  });
  // Kierownik na końcu: jego baner "GOTOWE" pojawia się, gdy reszta już stoi.
  for (const nr of [...Array.from({ length: total - 1 }, (_, i) => i + 1), 0]) {
    member(nr, nr === 0 ? "kierownik" : nr === 1 ? "prawa-reka" : "kolega", nr + 1, cwd);
    await sleep(200);
  }
}

const pick = async (title, placeHolder, items) => {
  const chosen = await vscode.window.showQuickPick(items, { title, placeHolder, ignoreFocusOut: true });
  return chosen; // undefined = Esc, cały kreator się kończy
};

async function askCount() {
  const answer = await vscode.window.showInputBox({
    title: "Tuned Team: ilu kolegów?",
    prompt: "Ilu kolegów oprócz kierownika i prawej ręki? (1–20)",
    value: "2",
    ignoreFocusOut: true,
    validateInput: (v) => (/^\d+$/.test(v) && v >= 1 && v <= 20 ? null : "Podaj liczbę od 1 do 20"),
  });
  return answer ? Number(answer) : undefined;
}

// Kreator: model, rozmiar pracy (z podpowiedzią liczby kolegów), zadanie cykliczne.
async function start() {
  const model = await pick("Tuned Team (1/3): jaki model?", "Model dla wszystkich okien zespołu", [
    { label: "Opus", description: "polecamy: najlepsza jakość", value: "opus" },
    { label: "Sonnet", description: "szybszy, zużywa mniej limitu", value: "sonnet" },
    { label: "Domyślny", description: "nie ustawiaj, zostaje jak w Claude Code", value: "" },
  ]);
  if (!model) return;

  const size = await pick("Tuned Team (2/3): jak duże zadanie?", "Od tego zależy, ilu kolegów polecamy", [
    { label: "Jedna funkcja albo poprawka", description: "polecamy 2 kolegów", value: 2 },
    { label: "Kilka zadań, pół dnia", description: "polecamy 4 kolegów", value: 4 },
    { label: "Cały dzień kodowania", description: "polecamy 6 kolegów (8 okien, limit schodzi szybciej)", value: 6 },
    { label: "Inna liczba…", description: "wpiszesz sam", value: 0 },
  ]);
  if (!size) return;
  const n = size.value || (await askCount());
  if (!n) return;

  const cron = await pick("Tuned Team (3/3): zadanie cykliczne?", "Kierownik ustawi je zaraz po starcie", [
    { label: "Nie", description: "bez zadań w tle", value: "" },
    {
      label: "Tak, co godzinę release",
      description: "kierownik prosi prawą rękę o sprawdzenie nowych commitów i release",
      value: "co godzinę napisz do prawej ręki: sprawdź nowe commity na głównej gałęzi i zrób release, jeśli są.",
    },
    { label: "Własne…", description: "wpiszesz sam, co i jak często", value: "custom" },
  ]);
  if (!cron) return;
  let cronText = cron.value;
  if (cron.value === "custom") {
    cronText = await vscode.window.showInputBox({
      title: "Tuned Team: własne zadanie cykliczne",
      prompt: "Co ma się powtarzać i jak często? Np. co 30 minut: sprawdź, czy testy przechodzą.",
      ignoreFocusOut: true,
    });
    if (!cronText) return;
  }
  return team(n, { model: model.value, sizeLabel: size.label.toLowerCase(), cron: cronText });
}

// One more colleague in a new editor group to the right (kierownik calls it).
async function add() {
  if (!supported()) return;
  const nr = Math.max(1, ...taken()) + 1;
  member(nr, "kolega", vscode.ViewColumn.Beside, cwdOf());
}

// Label the open Claude tabs "#N label" and tint their background: the terminal's
// shell pid -> its claude child -> ~/.claude/sessions/<pid>.json -> name "N-rola".
async function label() {
  const { execFileSync } = require("child_process");
  const home = os.homedir();
  const back = vscode.window.activeTerminal;
  for (const t of vscode.window.terminals) {
    const shell = await t.processId;
    if (!shell) continue;
    let kids = [];
    try {
      kids = execFileSync("pgrep", ["-P", String(shell)], { encoding: "utf8" }).split("\n").filter(Boolean);
    } catch {}
    for (const pid of kids) {
      let session;
      try {
        session = JSON.parse(fs.readFileSync(path.join(home, ".claude", "sessions", `${pid}.json`), "utf8"));
      } catch {
        continue;
      }
      const m = /^(\d+)-(.+)$/.exec(session.name || "");
      if (!m) continue;
      const nr = m[1];
      // Tło: sekwencja prosto na tty procesu claude, bez pisania w jego prompt.
      try {
        const tty = execFileSync("ps", ["-o", "tty=", "-p", pid], { encoding: "utf8" }).trim();
        if (tty && tty !== "??") fs.writeFileSync(`/dev/${tty}`, `\x1b]11;${tintHex(Number(nr))}\x07`);
      } catch {}
      // renameWithArg renames the active terminal: focus this one first.
      t.show(false);
      await sleep(150);
      let dot = "";
      try {
        dot = JSON.parse(fs.readFileSync(path.join(extensionPath, "colors.json"), "utf8"))[nr]?.[0] || "";
      } catch {}
      await vscode.commands.executeCommand("workbench.action.terminal.renameWithArg", { name: `${dot} #${nr} ${m[2].replace(/-/g, " ")}`.trim() });
      await sleep(100);
    }
  }
  back?.show(false);
}

exports.activate = (context) => {
  extensionPath = context.extensionPath;
  context.subscriptions.push(
    vscode.commands.registerCommand("tunedTeam.start", start),
    vscode.commands.registerCommand("tunedTeam.add", add),
    vscode.commands.registerCommand("tunedTeam.label", label),
    // skrót w shellu (adres zależy od edytora: vscode://, cursor://, windsurf://):
    //   open "vscode://zbela.tuned-team/team?n=4"
    //   open "vscode://zbela.tuned-team/add"
    vscode.window.registerUriHandler({
      handleUri: (uri) => {
        if (uri.path === "/add") return add();
        if (uri.path === "/label") return label();
        const q = new URLSearchParams(uri.query);
        const model = ["opus", "sonnet"].includes(q.get("model")) ? q.get("model") : "";
        return team(Math.max(1, Math.min(20, Number(q.get("n")) || 2)), { model });
      },
    }),
  );
};
exports.deactivate = () => {};
