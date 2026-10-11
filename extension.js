// Tuned Team: a team of Claude Code agents in one editor window.
// manager, deputy and N colleagues (numbered from 1), each in its
// own editor group, with a role from a .md file (--append-system-prompt). Roles:
// ~/.tuned-team/roles/<role>.md (your own) or defaults/roles/<role>.md from this extension.
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const os = require("os");

const EXT_ID = "tuned.tuned-team";
const ROWS = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const quote = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;

let extensionPath = "";

// A role from ~/.tuned-team/roles takes precedence over the built-in one.
function roleFile(role) {
  const own = path.join(os.homedir(), ".tuned-team", "roles", `${role}.md`);
  return fs.existsSync(own) ? own : path.join(extensionPath, "defaults", "roles", `${role}.md`);
}

// Each member has a background colour from colors.json; beyond the palette:
// golden angle by number. OSC 11 sets the terminal background.
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

// Grey banner in the manager's window, printed right before claude starts.
const BANNER = "TUNED TEAM · READY";
const bannerSeq = `\\033[48;5;240m\\033[38;5;255m\\033[1m  ${BANNER}  \\033[0m\\n`;

const cwdOf = () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

// One member: a terminal named like the session, claude with its role.
// perl replaces {{ROLES}} and {{ADD_URL}} in the role file (via environment
// variables, so paths with spaces and apostrophes are safe).
function launchCmd(nr, role, cwd, opts = session) {
  const name = nr === 0 ? "manager" : nr === 1 ? "deputy" : `${nr - 1}-colleague`;
  // Manager and deputy always run on Opus; the wizard's model applies to colleagues.
  const chosen = nr <= 1 ? "opus" : opts.model;
  const model = chosen ? ` --model ${quote(chosen)}` : "";
  // Lean start: no skills, no MCP servers. Colleagues keep only the project's own .mcp.json (e.g. the database).
  const hasMcp = cwd && fs.existsSync(path.join(cwd, ".mcp.json"));
  const lean = ` --disable-slash-commands --strict-mcp-config${nr >= 2 && hasMcp ? " --mcp-config .mcp.json" : ""}`;
  const start = nr === 0 ? ` ${quote(startMessage(opts))}` : "";
  const roles = path.dirname(roleFile("colleague"));
  const addUrl = `${vscode.env.uriScheme}://${EXT_ID}/add`;
  const prompt =
    `"$(TT_ROLES=${quote(roles)} TT_ADD=${quote(addUrl)} ` +
    `perl -pe 's/\\{\\{ROLES\\}\\}/$ENV{TT_ROLES}/g; s/\\{\\{ADD_URL\\}\\}/$ENV{TT_ADD}/g' ${quote(roleFile(role))}; ` +
    `printf '\\n\\nLanguage: ${opts.lang === "pl" ? "reply to the owner and write to teammates in Polish" : "reply to the owner and write to teammates in English"}.\\n')"`;
  const banner = nr === 0 ? `printf '${bannerSeq}'; ` : "";
  return `printf '${tintSeq(nr)}'; ${banner}claude -n ${name}${model}${lean} --append-system-prompt ${prompt}${start}`;
}

function member(nr, role, viewColumn, cwd, opts = session) {
  const label = nr >= 2 ? `#${nr - 1} ${role}` : role[0].toUpperCase() + role.slice(1);
  const t = vscode.window.createTerminal({ name: `${dotOf(nr)} ${label}`.trim(), cwd, location: { viewColumn, preserveFocus: true } });
  t.sendText(launchCmd(nr, role, cwd, opts));
  return t;
}

// Cull: exit a colleague's claude and start it fresh in the same terminal.
// Only for colleagues; the deputy calls it when the team table shows READY TO CLEAR for that colleague.
async function restart(k) {
  if (!(k >= 1)) return vscode.window.showErrorMessage("Tuned Team: only colleagues (#1 and up) can be restarted.");
  const nr = k + 1;
  const t = vscode.window.terminals.find((x) => new RegExp(`#${k} colleague`).test(x.name));
  if (!t) return vscode.window.showErrorMessage(`Tuned Team: no colleague #${k}.`);
  t.sendText("/exit");
  await sleep(3000);
  t.sendText(launchCmd(nr, "colleague", cwdOf()));
}

// Settings from the wizard; "add colleague" in the same editor window uses them too.
let session = {};

// The manager's first message: "start" plus what you said in the wizard.
function startMessage(opts) {
  let msg = "start";
  if (opts.sizeLabel) msg += `. Size of the work: ${opts.sizeLabel}. Colleagues: ${opts.n}.`;
  if (opts.cron) msg += ` Set up a recurring task right away: ${opts.cron}`;
  return msg;
}

// Numbers already open in this window (terminals are named "#N role").
function taken() {
  // Slots: manager 0, deputy 1, colleague k = k + 1 (terminals are named "#k colleague").
  return vscode.window.terminals.map((t) => /#(\d+) colleague/.exec(t.name)).filter(Boolean).map((m) => Number(m[1]) + 1);
}

function supported() {
  if (process.platform === "win32") {
    vscode.window.showErrorMessage("Tuned Team works on macOS and Linux. On Windows, run VS Code through WSL.");
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
  // Manager last: its "READY" banner appears once the rest is up.
  for (const nr of [...Array.from({ length: total - 1 }, (_, i) => i + 1), 0]) {
    member(nr, nr === 0 ? "manager" : nr === 1 ? "deputy" : "colleague", nr + 1, cwd);
    await sleep(200);
  }
}

const pick = async (title, placeHolder, items) => {
  const chosen = await vscode.window.showQuickPick(items, { title, placeHolder, ignoreFocusOut: true });
  return chosen; // undefined = Esc, the whole wizard ends
};

async function askCount() {
  const answer = await vscode.window.showInputBox({
    title: "Tuned Team: how many colleagues?",
    prompt: "How many colleagues besides the manager and the deputy? (1–20)",
    value: "2",
    ignoreFocusOut: true,
    validateInput: (v) => (/^\d+$/.test(v) && v >= 1 && v <= 20 ? null : "Enter a number from 1 to 20"),
  });
  return answer ? Number(answer) : undefined;
}

// Wizard: model, size of the work (with a suggested number of colleagues), recurring task.
async function start() {
  const model = await pick("Tuned Team (1/3): which model?", "Model for all team windows", [
    { label: "Opus", description: "recommended: best quality", value: "opus" },
    { label: "Sonnet", description: "faster, uses less of your limit", value: "sonnet" },
    { label: "Default", description: "do not set, stays as in Claude Code", value: "" },
  ]);
  if (!model) return;

  const size = await pick("Tuned Team (2/3): how big is the work?", "This decides how many colleagues we suggest", [
    { label: "One feature or fix", description: "we suggest 2 colleagues", value: 2 },
    { label: "A few tasks, half a day", description: "we suggest 4 colleagues", value: 4 },
    { label: "A full day of coding", description: "we suggest 6 colleagues (8 windows, the limit drains faster)", value: 6 },
    { label: "Other number…", description: "you type it", value: 0 },
  ]);
  if (!size) return;
  const n = size.value || (await askCount());
  if (!n) return;

  const cron = await pick("Tuned Team (3/3): recurring task?", "The manager sets it up right after start", [
    { label: "No", description: "no background tasks", value: "" },
    {
      label: "Yes, release every hour",
      description: "the manager asks the deputy to check new commits and release",
      value: "every hour write to the deputy: check for new commits on the main branch and release if there are any.",
    },
    { label: "Custom…", description: "you type what and how often", value: "custom" },
  ]);
  if (!cron) return;
  let cronText = cron.value;
  if (cron.value === "custom") {
    cronText = await vscode.window.showInputBox({
      title: "Tuned Team: custom recurring task",
      prompt: "What should repeat, and how often? E.g. every 30 minutes: check that the tests pass.",
      ignoreFocusOut: true,
    });
    if (!cronText) return;
  }
  return team(n, { model: model.value, sizeLabel: size.label.toLowerCase(), cron: cronText });
}

// One more colleague in a new editor group to the right (the manager calls it).
async function add() {
  if (!supported()) return;
  const nr = Math.max(1, ...taken()) + 1;
  member(nr, "colleague", vscode.ViewColumn.Beside, cwdOf());
}

// Label the open Claude tabs "#N label" and tint their background: the terminal's
// shell pid -> its claude child -> ~/.claude/sessions/<pid>.json -> name "N-role".
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
      const sn = session.name || "";
      const m = /^(\d+)-(.+)$/.exec(sn);
      const nr = String(sn === "manager" ? 0 : sn === "deputy" ? 1 : m ? Number(m[1]) + 1 : -1);
      if (nr === "-1") continue;
      const title = m ? `#${m[1]} ${m[2].replace(/-/g, " ")}` : sn[0].toUpperCase() + sn.slice(1);
      // Background: sequence straight to the claude process's tty, without typing into its prompt.
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
      await vscode.commands.executeCommand("workbench.action.terminal.renameWithArg", { name: `${dot} ${title}`.trim() });
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
    // shell shortcut (the scheme depends on the editor: vscode://, cursor://, windsurf://):
    //   open "vscode://tuned.tuned-team/team?n=4"
    //   open "vscode://tuned.tuned-team/add"
    vscode.window.registerUriHandler({
      handleUri: (uri) => {
        if (uri.path === "/add") return add();
        if (uri.path === "/restart") return restart(Number(new URLSearchParams(uri.query).get("nr")));
        if (uri.path === "/label") return label();
        const q = new URLSearchParams(uri.query);
        const model = ["opus", "sonnet"].includes(q.get("model")) ? q.get("model") : "";
        const lang = q.get("lang") === "pl" ? "pl" : "en";
        return team(Math.max(1, Math.min(20, Number(q.get("n")) || 2)), { model, lang });
      },
    }),
  );
};
exports.deactivate = () => {};
