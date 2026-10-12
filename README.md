# Tuned Team

A VS Code extension that opens a team of Claude Code agents in one window. Each agent has its own terminal, colour and role:

- **manager** talks to you and hands out tasks,
- **deputy** watches team state and housekeeping,
- **#1, #2… colleagues** do the tasks, each on its own branch.

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
- Each window has its own background colour, so you see at a glance which one you are in. The palette has 15 colours (`colors.json`); beyond that, colours are computed.
- The manager gets "start" on launch and asks you what we are doing. It passes each task to the deputy, who gives it to a free colleague, briefly, pointing to the rules in `colleague.md`.
- A colleague works on its own branch and a separate worktree, so it does not overwrite other people's files. It runs the tests before merging.
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
- **Team table** (`tuned-agenci`): laid out like the tree above. Manager and deputy have their own section with their own status (talking, on watch, waiting for you, missing), colleagues are listed below with who is free, who is working, who waits for you, context and ETA.

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

> Set up a recurring task every hour: write to the deputy "check for new commits on the base branch and release if there are any".

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
| Tuned Team: label tabs with numbers | gives tabs a name with a number and a colour |
| Tuned Team: control mode | changes the project's control mode (see "Control mode") |

After "Tuned Team: start" you answer four questions (Esc cancels, nothing opens then):

1. **Who decides?** I DECIDE ALL or ALL CLAUDE, remembered for this project. See "Control mode".
2. **Which model?** Opus (recommended, best quality), Sonnet (faster, uses less of your limit) or the Claude Code default. It applies to colleagues; the manager and the deputy always run on Opus.
3. **How big is the work?** This decides how many colleagues we suggest (table below). You can also type your own number.
4. **Recurring task?** No (default), "release every hour", or your own. The manager sets it up right after start. See the "Recurring tasks (cron)" section.

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

## Built with Tuned Team

[tunedparty.com](https://tunedparty.com) is built with Tuned Team: a whole product, not a single ticket. Game rooms in 6 languages, a question bank with thousands of questions, a panel for companies, a radio, help pages and a blog. Several colleagues work on it in parallel every day, each on its own branch, while the owner talks only to the manager.

Tuned Team is not a tool for one Jira task. It replaces a whole team's flow: the manager plans and hands out work, the deputy keeps track of state and releases, colleagues build and test on their own branches, and you decide. For one small fix, a single Claude Code window is enough.

## For the author: a new version

```sh
npx --yes @vscode/vsce package --allow-missing-repository --skip-license -o dist/tuned-team-<version>.vsix
```

Bump `version` in `package.json` before building and include the new file from `dist/` in the commit.
