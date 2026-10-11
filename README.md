# Tuned Team

A VS Code extension that opens a team of Claude Code agents in one window. Each agent has its own terminal, colour and role:

- **#0 manager** talks to you and hands out tasks,
- **#1 deputy** watches team state and housekeeping,
- **#2, #3… colleagues** do the tasks, each on its own branch.

## How it works

Instead of one window with one agent, you get several at once. You mostly talk to the manager, who hands out the work.

```
┌──────────────┬──────────────┬──────────────┐
│ #0 manager   │ #1 deputy    │ #2 colleague │
├──────────────┼──────────────┼──────────────┤
│ #3 colleague │ #4 colleague │ #5 colleague │
└──────────────┴──────────────┴──────────────┘
```

- Each cell is a separate terminal running `claude`, started with a window name (`0-manager`, `1-deputy`, `3-colleague`) and a role from a Markdown file. Agents know each other by these names and write to each other with `SendMessage`.
- Each window has its own background colour, so you see at a glance which one you are in. The palette has 15 colours (`colors.json`); beyond that, colours are computed.
- The manager gets "start" on launch and asks you what we are doing. It gives tasks to free colleagues, briefly, pointing to the rules in `colleague.md`.
- A colleague works on its own branch and a separate worktree, so it does not overwrite other people's files. It runs the tests before merging.
- When the manager needs more hands, it calls `Tuned Team: add colleague` (address `…://zbela.tuned-team/add`), and a new window appears on the right.

This is how the work flows. Colleagues at the top (8 here as an example, 2–6 is usually enough), the manager and deputy below them, you at the bottom:

```
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│   #2  │ │   #3  │ │   #4  │ │   #5  │
└───────┘ └───────┘ └───────┘ └───────┘
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│   #6  │ │   #7  │ │   #8  │ │   #9  │
└───────┘ └───────┘ └───────┘ └───────┘
         ▲ tasks              ▲ tasks
┌────────────────┐   ┌────────────────┐
│   #0 manager   │   │   #1 deputy    │
└────────────────┘   └────────────────┘
         ▲                    ▲
         │ conversation       ┆ when the manager does not answer
         └────────┐    ┌──────┘
               ┌──┴────┴──┐
               │   You    │
               └──────────┘
```

- You talk to the manager. The deputy stands next to them and stands in when the manager does not answer (dashed line).
- The manager and the deputy give tasks to colleagues.
- Colleagues ask you directly in their own window, with no go-between.

**Why two people on top.** The deputy is the manager's stand-in. When the manager goes down (window closed, context full, stops answering), the deputy takes over the conversation with you and may write to you directly. Normally you talk to the manager, and the deputy runs team matters in the background.

### Tuned Team and agency-agents: why both

[agency-agents](https://github.com/msitarzewski/agency-agents) is a set of 230+ ready-made specialist descriptions (frontend, security, testing, marketing…). It is knowledge: who such an agent is and how it works. Tuned Team is the organisation of work: who hands out tasks, who stands in for the manager, how many windows run at once.

- Tuned Team without agency-agents: colleagues are general agents, with no specialty.
- Agency-agents without Tuned Team: you call specialists one at a time, in one conversation, with no division of work.
- Together: the manager gives a colleague a task, and the colleague calls a specialist as a subagent. The subagent works in its own clean context and hands back only a summary, so the colleague's window does not fill up.

Installing the specialists: follow the agency-agents instructions, e.g. `./scripts/install.sh --tool claude-code`, which copies files to `~/.claude/agents/`. We have not yet tested this combination in a Tuned Team window. We expect it to work, because these are ordinary Claude Code subagents, but that is an assumption.

### What is in version 0.1.0

- Window layout, tab colours, roles, adding colleagues and labelling tabs with numbers.
- Roles are plain Markdown files. You can change them (see "Custom roles" below).
- There are no system pop-ups or sounds. The extension notifies nothing outside the editor window.

### Planned for 0.2.0 (not in the repo yet)

Things that work for the author but have not been moved to this repo yet:

- **Status bar with context percentage.** Up to 29% a plain bar (`repo (main) | Opus | ctx 22%`). From 30% a red percentage with a CONTEXT ALERT note: the agent takes no new tasks and finishes the current one. From 35% it hands its open tasks to a colleague with a clean window.
- **READY TO CLEAR.** When a colleague has finished, merged its work and handed over its tasks, it runs `tuned-daj-clear`. The bar then shows a clear READY TO CLEAR label. It is the sign that the context can be cleared (`/clear`). The label disappears after clearing.
- **Reports without messages.** `tuned-meldunek start "~15:00" "what I'm doing"`, `eta`, `gotowe "commit abc123"` write state to a file, so they use no tokens.
- **Team table** (`tuned-agenci`): who is waiting for you, who is working, who is free, how much context each has and its ETA.

### Context limit: what it means

An agent "remembers" the conversation in a window of finite size, called the context. The status bar shows how much of it is used (`ctx 31%`). The closer to the limit, the worse the agent works and the more it costs, so after a while the window has to be cleared (`/clear`) and started from scratch. The team does this in order so nothing is lost. The thresholds are the author's settings, not a Claude Code rule.

This is what the bar looks like in successive states (colours are not visible on GitHub; in the editor the percentage is red from 30%):

```
up to 29%  repo (main) | Opus | ctx 22%
from 30%   repo (main) | Opus | ctx 31% · CONTEXT ALERT     agent takes no new tasks, finishes the current one
from 35%   repo (main) | Opus | ctx 36% · CONTEXT ALERT     agent hands its tasks to a colleague with a clean window
done       repo (main) | Opus | ctx 36% · READY TO CLEAR
           ^ a colleague ran tuned-daj-clear: nothing is open, you can type /clear
```

This is a preview of the planned 0.2.0 look, not a screenshot of the working extension.

### Recurring tasks (cron)

The extension starts nothing in the background on its own. If you want the team to do something regularly (e.g. check for new commits and release every hour), ask the manager in its window, for example:

> Set up a recurring task every hour: write to the deputy "check for new commits on main and release if there are any".

Claude Code has the `/loop` command and a recurring-task tool for this. They usually last only as long as the session: after the window is closed or after `/clear` they are gone and you have to ask again (check the Claude Code docs for how it works in your version).

To avoid asking every time, add it to your own manager role in `~/.tuned-team/roles/manager.md`, under "On start", e.g. "set up a recurring task every hour: …". The manager will do it at every team start. The built-in manager role sets no recurring tasks.

## Requirements

- macOS or Linux (on Windows only through WSL).
- VS Code 1.90 or newer. It should also work in Cursor, Windsurf and VSCodium, but I have not tested that.
- [Claude Code](https://claude.com/claude-code) installed (the `claude` command in the terminal) and a signed-in account.
- `perl` (present on macOS and most Linux systems).

It will not work in PhpStorm or other JetBrains IDEs.

## Installation

```sh
git clone git@github.com:zdzislawbela/tuned-team.git
cd tuned-team
./install.sh            # VS Code
./install.sh cursor     # Cursor (likewise: windsurf, codium)
```

If the script does not find the `code` command: in VS Code press Cmd+Shift+P (Ctrl+Shift+P on Linux) and choose "Shell Command: Install 'code' command in PATH", then restart the terminal.

Without the script: Cmd+Shift+P → "Extensions: Install from VSIX…" and point to the file in `dist/`.

After installing, reload the window (Cmd+Shift+P → "Developer: Reload Window").

## Usage

Open a project folder, then Cmd+Shift+P:

| Command | What it does |
|---|---|
| Tuned Team: start | wizard with three questions (model, size of the work, recurring task), then opens the team |
| Tuned Team: add colleague | adds one more colleague on the right |
| Tuned Team: label tabs with numbers | gives tabs a name with a number and a colour |

After "Tuned Team: start" you answer three questions (Esc cancels, nothing opens then):

1. **Which model?** Opus (recommended, best quality), Sonnet (faster, uses less of your limit) or the Claude Code default. It applies to colleagues; the manager and the deputy always run on Opus.
2. **How big is the work?** This decides how many colleagues we suggest (table below). You can also type your own number.
3. **Recurring task?** No, "release every hour", or your own. The manager sets it up right after start. See the "Recurring tasks (cron)" section.

The manager starts with the message "start" plus your answers and asks what we are doing.

### How many windows to open

The wizard suggests a number of colleagues by the size of the work. Add the manager and the deputy to get the number of windows.

| Work | Suggested colleagues | Windows in total |
|---|---|---|
| one feature or fix | 2 | 4 |
| a few tasks, half a day | 4 | 6 |
| a full day of coding | 6 | 8 |

These are suggestions, not rules. You can type your own number (1 to 20) in the wizard. The terminal shortcut without a number opens 2 colleagues and skips the questions.

- **Start with 2 and add more as needed** with the "Tuned Team: add colleague" command. The new window appears on the right.
- **As many colleagues as you have independent tasks at once**, meaning ones that touch different files and different branches. A colleague with no task waits and does nothing, and the manager and the deputy have to remember it. 
- **A good task for a colleague** can be described in 2–4 sentences (what and why) and finished without constant questions to you. Give tasks that change the same files to one colleague, because two will start overwriting each other.
- **Every working window uses up your Claude account limit.** The more windows run at once, the faster the weekly limit runs out. The author sticks to at most 8 windows (manager, deputy and 6 colleagues) and measured that with 15 windows working at once the limit dropped by about 1% per 10 minutes. That is a measurement from one account and one plan; yours may differ.

### Terminal shortcut (optional)

Add to `~/.zshrc`:

```sh
tuned-team() { open "vscode://zbela.tuned-team/team?n=${1:-2}"; }
```

`tuned-team 4` opens the manager, the deputy and four colleagues. In Cursor replace `vscode://` with `cursor://`, in Windsurf with `windsurf://`. On Linux use `xdg-open` instead of `open`.

## Custom roles

Roles are plain Markdown files: `manager.md`, `deputy.md`, `colleague.md`. The extension takes them from `~/.tuned-team/roles/` and uses the built-in ones from `defaults/roles/` only when they are not there.

```sh
mkdir -p ~/.tuned-team/roles
cp defaults/roles/*.md ~/.tuned-team/roles/
```

Change the files there and open the team again. In a role text you can use two placeholders: `{{ROLES}}` (the roles folder, e.g. for "Rules: {{ROLES}}/colleague.md") and `{{ADD_URL}}` (the address the manager uses to add a colleague).

## Updating and uninstalling

Update: `git pull && ./install.sh`. Uninstall: Extensions → Tuned Team → Uninstall. Your own roles in `~/.tuned-team/` stay.

## For the author: a new version

```sh
npx --yes @vscode/vsce package --allow-missing-repository --skip-license -o dist/tuned-team-<version>.vsix
```

Bump `version` in `package.json` before building and include the new file from `dist/` in the commit.
