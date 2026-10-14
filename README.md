# Tuned Team

A VS Code extension that opens a team of Claude Code agents in one window. Each agent has its own terminal and role:

- **manager** talks to you and hands out tasks,
- **deputy** watches team state and housekeeping,
- **#1, #2… colleagues** do the tasks, each on its own branch.

## Built with Tuned Team

[tunedparty.com](https://tunedparty.com) is built with Tuned Team: a whole product, not a single ticket. Game rooms in 6 languages, a question bank with thousands of questions, a panel for companies, a radio, help pages and a blog. Several colleagues work on it in parallel every day, each on its own branch, while the owner talks only to the manager.

Tuned Team is not a tool for one Jira task. It replaces a whole team's flow: the manager plans and hands out work, the deputy keeps track of state and releases, colleagues build and test on their own branches, and you decide. Or use it to multiply one developer: several colleagues take independent tasks at once, each on its own branch, so they do not get in each other's way. For one small fix, a single Claude Code window is enough.

## How it works

Instead of one window with one agent, you get several at once. You mostly talk to the manager, who hands out the work.

```
┌──────────────┬──────────────┬──────────────┐
│ manager      │ deputy       │ #1 colleague │
├──────────────┼──────────────┼──────────────┤
│ #2 colleague │ #3 colleague │ #4 colleague │
└──────────────┴──────────────┴──────────────┘
```

- Each cell is a separate terminal running `claude`, started with a window name (`manager`, `deputy`, `2-colleague`; colleagues are numbered from 1) and a role from a Markdown file. Agents know each other by these names and write to each other with `SendMessage`.
- The window's background shows how much context it has used, as a red heatmap: black up to 10%, then redder, full red from 30% (time to clear). Counted against the model's real window (Opus = 1M tokens). The status line `tuned-statusline.sh` sets it, so it needs that status line (see below). The number `#N` in the tab name tells windows apart.
- When the team needs more hands, the deputy gives you the command for `Tuned Team: add colleague` (`! open "vscode://tuned.tuned-team/add"`; the sandbox blocks `open` for agents), and a new window appears on the right.

This is how the work flows. Tasks go down, reports come back up:

```
                ┌──────────────┐
                │   Prompter   │   you: you say what you want
                └──────────────┘
                  │          ▲
       what you want        answers, questions, "done"
                  ▼          │
                ┌──────────────┐
                │   Manager    │   talks to you, passes tasks on
                └──────────────┘
                  │          ▲
   team matters + tasks      only what needs you
                  ▼          │
                ┌──────────────┐
                │    Deputy    │   hands out tasks, release, housekeeping,
                └──────────────┘   stands in for the manager
                  │          ▲
                tasks       state: tuned-meldunek (no messages),
                  ▼          │    messages only for blockers and finished work
   ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
   │  #1   │ │  #2   │ │  #3   │ │  #4   │   colleagues: the only ones
   └───────┘ └───────┘ └───────┘ └───────┘   who do the work, each on its own branch
```

- **Prompter** is you. You talk to the manager only.
- **Manager** talks only to you and the deputy. It passes your tasks to the deputy and does not write to colleagues. It does not do tasks itself, writes no code and creates no branches.
- **Deputy** runs the team: hands tasks to free colleagues, release, repository housekeeping, standing tasks, who is free. Colleagues report only to the deputy; the deputy sends the manager only what you need to see. It does not do product tasks either. When the manager goes down (window closed, context full, no answer), the deputy takes over the conversation with you and says so.
- **Colleagues (#1, #2…)** are the only ones who do tasks. Each new task starts on the colleague's own branch and worktree. They write their state with `tuned-meldunek` (no tokens), report to the deputy, and ask you in their own window only for permission prompts.

**Why two people on top.** The manager stays free to talk to you while the deputy keeps the team in order in the background.

### Control mode

One setting per project, chosen in the first wizard step and remembered for that folder. Change it with `Tuned Team: control mode`; running windows get the new mode after a restart.

- **I DECIDE ALL** (default, for work projects): release, push, deploy and changes to settings or permissions wait for your "yes", after the team shows you the exact repo, branch and commits. You push yourself: the deputy gives you the exact command.
- **ALL CLAUDE** (hobby projects): the deputy releases from the base branch on its own, and colleagues do not ask you about each step. Permission prompts and sandbox blocks still come to you.

It only steers the team's roles (it is added to every window's prompt). It does not change Claude Code's permissions or auto mode. No branch is assumed: the team checks the project's base branch (e.g. `master`) instead of assuming `main`.

### What stays manual

The Claude Code sandbox blocks `git push` (no access to `~/.ssh`) and `open "vscode://…"` for agents. Tuned Team adds no sandbox exceptions for them. The deputy gives you the exact command and you run it with `!` in its window, e.g. `! git push origin master` or `! open "vscode://tuned.tuned-team/add"`.

### Tuned Team and agency-agents

[agency-agents](https://github.com/msitarzewski/agency-agents) is a set of ready-made specialist subagents (frontend, security, testing…). Tuned Team organises the work; a colleague can call such a specialist as a subagent, which works in its own context and hands back only a summary. We have not tested this combination yet.

### Team helpers

`install.sh` links these into `~/bin` (they need `python3` and `jq`):

- `tuned-agenci deputy`: the team table. Who is free, working, waiting for you, context, ETA, READY TO CLEAR.
- `tuned-meldunek start "~15:00" "what"`, `eta "~16:00"`, `done "commit abc123"`: a colleague writes its state to a file instead of sending a message, so it costs no tokens.
- `tuned-daj-clear`: a colleague with nothing open marks itself READY TO CLEAR; you can then type `/clear` in its window.
- `tuned-statusline.sh` (optional, set it as `statusLine` in `~/.claude/settings.json`): folder, branch, model, context; also turns the window background red as context fills up.

```
up to 29%  repo (main) | Opus | ctx 22%
from 30%   repo (main) | Opus | ctx 31% · CONTEXT ALERT     no new tasks, finish the current one
from 35%   repo (main) | Opus | ctx 36% · CONTEXT ALERT     hand the tasks to a colleague with a clean window
done       repo (main) | Opus | ctx 36% · READY TO CLEAR    nothing is open, you can /clear
```

Context is how much of the conversation the agent keeps in its window. The fuller it is, the worse and more expensive the agent works, so the team clears windows in order. The 30% / 35% thresholds are the author's settings, not a Claude Code rule.

### Recurring tasks (cron)

The extension starts nothing in the background on its own. If you want the team to do something regularly (e.g. check for new commits and release every hour), ask the manager in its window, for example:

> Set up a recurring task every hour: write to the deputy "check for new commits on the base branch and release if there are any".

Claude Code has the `/loop` command and a recurring-task tool for this. They usually last only as long as the session: after the window is closed or after `/clear` they are gone and you have to ask again (check the Claude Code docs for how it works in your version).

To avoid asking every time, add it to your own manager role in `~/.tuned-team/roles/manager.md`, under "On start", e.g. "set up a recurring task every hour: …". The manager will do it at every team start. The built-in manager role sets no recurring tasks.

## Requirements

- macOS or Linux (on Windows only through WSL).
- VS Code 1.90 or newer. It should also work in Cursor, Windsurf and VSCodium, but I have not tested that.
- [Claude Code](https://claude.com/claude-code) installed (the `claude` command in the terminal) and a signed-in account.
- `perl` and `python3` (present on macOS and most Linux systems), and `jq` for the helpers.

It will not work in PhpStorm or other JetBrains IDEs.

## Installation

```sh
git clone git@github.com:zdzislawbela/tuned-team.git
cd tuned-team
./install.sh            # VS Code
./install.sh cursor     # Cursor (likewise: windsurf, codium)
```

If the script does not find the `code` command: in VS Code press Cmd+Shift+P (Ctrl+Shift+P on Linux) and choose "Shell Command: Install 'code' command in PATH", then restart the terminal.

The script packs the extension from this folder into a `.vsix` (plain `zip`, no Node needed) and installs it. Keep the folder: the helpers in `~/bin` link to it.

After installing, reload the window (Cmd+Shift+P → "Developer: Reload Window").

### Auto mode

In auto mode the Claude Code classifier can block writes to the team's task list `~/bin/.tuned-zlecenia.json` ("Unauthorized Persistence"), even when `Write` is allowed. At the end, `install.sh` runs `./allow-rules.sh`, which shows the exact diff for `~/.claude/settings.json` and changes nothing unless you answer `y`. It adds:

- `permissions.allow`: `Edit(~/bin/.tuned-zlecenia.json)`;
- `autoMode.allow`: `$defaults` (keeps the built-in exceptions) plus one plain-language exception for the task list.

A backup goes to `settings.json.tuned-bak`. `./allow-rules.sh --dry-run` only shows the diff, and running it again adds only what is missing. Restart open Claude Code windows afterwards. If auto mode still blocks something, the agent asks you in its window instead of working around it.

## Usage

Open a project folder, then Cmd+Shift+P:

| Command | What it does |
|---|---|
| Tuned Team: start | wizard with four questions (control mode, model, size of the work, recurring task), then opens the team |
| Tuned Team: add colleague | adds one more colleague on the right |
| Tuned Team: label tabs with numbers | gives tabs a name with a number |
| Tuned Team: control mode | changes the project's control mode (see "Control mode") |

After "Tuned Team: start" you answer four questions (Esc cancels, nothing opens then):

1. **Who decides?** I DECIDE ALL or ALL CLAUDE, remembered for this project. See "Control mode".
2. **Which model?** Opus (recommended, best quality), Sonnet (faster, uses less of your limit) or the Claude Code default. It applies to colleagues; the manager and the deputy always run on Opus.
3. **How big is the work?** This decides how many colleagues we suggest (table below). You can also type your own number.
4. **Recurring task?** No (default), "release every hour", or your own. The manager sets it up right after start. See the "Recurring tasks (cron)" section.

The manager starts with the message "start" plus your answers and asks what we are doing.

Every window starts like a plain `claude`: slash commands, skills, the project's MCP servers and the claude.ai connectors (e.g. Claude Docs) are all there.

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
tuned-team() { open "vscode://tuned.tuned-team/team?n=${1:-2}"; }
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

Bump `version` in `package.json`, commit and push. There is no `.vsix` in the repo: `install.sh` builds it on the spot, so after `git pull && ./install.sh` and "Developer: Reload Window" everyone has the new version.
