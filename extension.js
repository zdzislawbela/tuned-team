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

const cwdOf = () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

// One member: a terminal named like the session, claude with its role.
// Miejsca {{ROLES}} i {{ADD_URL}} w pliku roli podmienia perl (zmienne
// środowiskowe, więc ścieżki ze spacjami i apostrofami są bezpieczne).
function member(nr, role, viewColumn, cwd) {
  const name = nr === 0 ? "0-kierownik" : nr === 1 ? "1-prawa-reka" : `${nr}-kolega`;
  const t = vscode.window.createTerminal({ name: `#${nr} ${role}`, cwd, location: { viewColumn, preserveFocus: true } });
  const start = nr === 0 ? ' "start"' : "";
  const roles = path.dirname(roleFile("kolega"));
  const addUrl = `${vscode.env.uriScheme}://${EXT_ID}/add`;
  const prompt =
    `"$(TT_ROLES=${quote(roles)} TT_ADD=${quote(addUrl)} ` +
    `perl -pe 's/\\{\\{ROLES\\}\\}/$ENV{TT_ROLES}/g; s/\\{\\{ADD_URL\\}\\}/$ENV{TT_ADD}/g' ${quote(roleFile(role))})"`;
  t.sendText(`printf '${tintSeq(nr)}'; claude -n ${name} --append-system-prompt ${prompt}${start}`);
  return t;
}

// Numbers already open in this window (terminals are named "#N role").
function taken() {
  return vscode.window.terminals.map((t) => /^#(\d+) /.exec(t.name)).filter(Boolean).map((m) => Number(m[1]));
}

function supported() {
  if (process.platform === "win32") {
    vscode.window.showErrorMessage("Tuned Team działa na macOS i Linuksie. W Windows uruchom VS Code przez WSL.");
    return false;
  }
  return true;
}

async function team(n) {
  if (!supported()) return;
  const cwd = cwdOf();
  const total = n + 2;
  const cols = Math.ceil(total / ROWS);
  await vscode.commands.executeCommand("vscode.setEditorLayout", {
    orientation: 1,
    groups: Array.from({ length: ROWS }, () => ({ groups: Array.from({ length: cols }, () => ({})) })),
  });
  for (let nr = 0; nr < total; nr++) {
    member(nr, nr === 0 ? "kierownik" : nr === 1 ? "prawa-reka" : "kolega", nr + 1, cwd);
    await sleep(200);
  }
}

async function start() {
  const answer = await vscode.window.showInputBox({
    title: "Tuned Team",
    prompt: "Ilu kolegów oprócz kierownika i prawej ręki? (1–20)",
    value: "2",
    validateInput: (v) => (/^\d+$/.test(v) && v >= 1 && v <= 20 ? null : "Podaj liczbę od 1 do 20"),
  });
  if (answer) return team(Number(answer));
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
        return team(Math.max(1, Math.min(20, Number(new URLSearchParams(uri.query).get("n")) || 4)));
      },
    }),
  );
};
exports.deactivate = () => {};
