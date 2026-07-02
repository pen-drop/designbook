---
name: run
description: Set up a fresh test workspace from a fixture case and execute its prompt.
---

# run

Set up a fresh test workspace from a fixture case and execute its prompt.

## 1. List cases (no case argument)

If only `<suite>` is provided:

1. List all `.yaml` files in `fixtures/<suite>/cases/`
2. Show them as a numbered list with the `fixtures` field from each case
3. Ask the user to pick one

## 2. Setup workspace

Always create a fresh workspace — never reuse an existing one.

1. If `workspaces/<suite>` already exists, **delete it first**: `rm -rf workspaces/<suite>`
2. Run `./scripts/setup-workspace.sh <suite>` — creates the base workspace with Storybook infrastructure and `pnpm install`
3. Run: `./scripts/setup-test.sh <suite> <case> --into workspaces/<suite>` — layers fixtures and config onto the workspace
4. Report the workspace path to the user

## 3. Start Storybook

After setup, start Storybook via the addon CLI. Run these commands from the designbook working dir (`workspaces/<suite>/web/themes/custom/test_integration_drupal`):

```bash
cd workspaces/<suite>/web/themes/custom/test_integration_drupal
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
_debo storybook start
```

Report the Storybook URL to the user (`_debo storybook status` returns the `url` field when running).

## 4. Display prompt and confirm

1. Read `fixtures/<suite>/cases/<case>.yaml`
2. Display the `prompt` field to the user
3. Ask: "Execute this prompt in the workspace? (y/n)"
4. If **yes**: dispatch **one** subagent to run the whole workflow — do NOT execute it inline on this thread. The subagent is the workflow driver; give it:
   - `workspaces/<suite>/web/themes/custom/test_integration_drupal` as its working directory (run all `_debo` / `npx storybook-addon-designbook` commands from there),
   - the case `prompt` verbatim as the task to execute,
   - this instruction: *drive the full designbook workflow lifecycle per `resources/workflow-execution.md` (`workflow create` → task loop → `workflow done`) entirely inline within your own context. You are already a subagent and cannot spawn further subagents, so run every stage inline — including stages marked `isolate: true` (read their task/rules/blueprints and call `workflow done` yourself; do not dispatch a stage executor).*
   - **ask, don't guess:** *whenever a task body or stage asks the user to choose/confirm something you cannot answer from the case prompt + data model alone (screen type, which entities, component plan, layout decisions), STOP and return `status: needs_user` with the workflow name and the exact question(s). Do NOT invent an answer.*
   - report contract: return `status: needs_user` (with questions) or `status: done` plus the final `workflow summary --json` and one line per stage on what it produced — no task bodies, rule text, or file contents.

   **Interactive loop.** When the driver returns:
   - `needs_user` → relay its question(s) to the user verbatim, get the answer, then dispatch a **fresh** driver subagent told to **resume** the existing workflow by name (the lifecycle state is on disk — `workflow list`/`workflow instructions` re-surface it) with the user's answer in its context. Repeat until `done`.
   - `done` → relay the summary to the user.
5. If **no**: Tell the user the workspace is ready for manual use

Use `_debo storybook stop` to stop Storybook when the session ends or the user requests it.

## 5. Workflow summary (after workflow completion)

After the workflow completes, retrieve and display the summary:

```bash
npx storybook-addon-designbook workflow summary --workflow <id> --json
```

Display the full JSON output, including the `after.*` block (e.g. `after.design-verify.score-report`) when present, so the user can review scores and after-hook results before deciding on a snapshot.

## 6. Snapshot offer

After the workflow completes:

1. `cd` into the theme dir (`workspaces/<suite>/web/themes/custom/test_integration_drupal`) — that is the git repo root for the workspace
2. Run `git diff --name-only` and `git ls-files --others --exclude-standard` to find changed/new files
3. Exclude `.agents/`, `.claude/`, `.storybook/`, `node_modules/` from the list
4. Display the list of changed files to the user
5. Ask: "Save as fixture? Enter name (default: <case>) or 'n' to skip"
6. If the user provides a name (or accepts default):
   - For each changed/new file, copy it to `fixtures/<suite>/<fixture-name>/` preserving the workspace-relative path
   - Report: "✓ Fixture saved to fixtures/<suite>/<fixture-name>/"
7. If the user declines: do nothing, workspace remains
