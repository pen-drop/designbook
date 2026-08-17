---
name: run
description: Set up a fresh test workspace from a fixture case and execute its prompt.
---

# run

Set up a fresh test workspace from a fixture case and execute its prompt.

## Paths (Drupal-layout workspace)

After `setup-workspace.sh` the workspace is a Drupal tree:

| Path | Use for |
|---|---|
| `workspaces/<suite>` (**workspace root**) | All `_debo workflow *`, `sync-to`, `config`, `eval "$(_debo config)"` |
| `workspaces/<suite>/web/themes/custom/test_integration_drupal` (**theme dir**) | Storybook start/status/stop only; theme git repo for fixture diffs |

`designbook.config.yml` lives at the **workspace root**. Never put a second copy in the theme dir (it shadows the root). `setup-test.sh` merges case config overrides into the root config.

## 1. List cases (no case argument)

If only `<suite>` is provided:

1. List all `.yaml` files in `fixtures/<suite>/cases/`
2. Show them as a numbered list with the `fixtures` field from each case
3. Ask the user to pick one

## 2. Setup workspace

Always create a fresh workspace — never reuse an existing one.

1. If `workspaces/<suite>` already exists, **delete it first**: `rm -rf workspaces/<suite>`
2. Run `./scripts/setup-workspace.sh <suite>` — creates the base workspace with Storybook infrastructure and `pnpm install`
3. Run: `./scripts/setup-test.sh <suite> <case> --into workspaces/<suite>` — layers fixtures and merges case config into the workspace-root `designbook.config.yml`
4. Report the workspace path to the user

## 3. Start services

### 3a. Storybook (theme dir)

```bash
cd workspaces/<suite>/web/themes/custom/test_integration_drupal
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"   # may resolve config from parent workspace root
_debo storybook start
```

Report the Storybook URL (`_debo storybook status` → `url`).

### 3b. Drupal (when the suite needs the backend)

For `drupal-*` suites (or any case whose prompt runs `ddev` / `sync-to` / `sync-verify`):

```bash
./scripts/start-drupal-workspace.sh <suite>
```

Then smoke-check from the **workspace root**:

```bash
cd workspaces/<suite>
ddev drush status
ddev drush pm:list --status=enabled --format=list | rg -i 'designbook|ui_patterns|layout_builder' || true
```

If `pm:enable` fails on a missing module name, fix the fixture / active `core.extension` before continuing — do not invent modules.

## 4. Display prompt and execute

1. Read `fixtures/<suite>/cases/<case>.yaml`
2. Display the `prompt` field to the user
3. **Confirmation:** If the user already invoked `debo-test run <suite> <case>` (case name present), treat that as yes — do **not** ask y/n. Only ask `"Execute this prompt in the workspace? (y/n)"` when the case was chosen interactively in step 1.
4. If **yes**: drive the workflow with **one fresh subagent per stage** (the default). Do NOT run the whole workflow inline on this thread, and do NOT hand the entire lifecycle to a single long-lived subagent — a single driver accumulates the whole run's context (page dumps, task bodies, every stage's rules) and its per-request latency grows across the run. Per-stage subagents keep each driver's context small; the workflow lifecycle state lives on disk, so a fresh subagent resumes it cleanly.

   **Per-stage driver loop (default).**
   1. **Create** the workflow yourself on this thread: run `workflow create` from the case `prompt` (per `resources/workflow-execution.md`) from the **workspace root**. Keep the `stages` list and `step_resolved` from the response — it is the ordered stage sequence. (`backend_cmd` and `config_sync_dir` resolve from designbook.config.yml — do not hand-copy them into `--params` unless overriding.)
   2. For each stage in order, dispatch **one fresh subagent** for that stage and wait for it before the next. Give the stage subagent:
      - `workspaces/<suite>` as its working directory for all `_debo` / `npx storybook-addon-designbook` / `ddev` commands (workspace root),
      - the theme dir path only for Storybook restart (`…/web/themes/custom/test_integration_drupal`),
      - the workflow name and the stage name,
      - this instruction: *resume the on-disk workflow for this stage — run `workflow instructions --workflow <name> --stage <stage>` to load the stage's task/rules/blueprints, execute the stage's task(s) (loop over `each`-expanded sibling tasks; use `workflow batch-done` for large each-stages), and call `workflow done` yourself for each. Do not touch other stages. When Storybook is stale (component files newer than the running daemon — the `playwright-capture` / `playwright-validate` preflight), you MUST restart it with `_debo storybook start --force` from the **theme dir** before capturing or validating; restarting is required, never forbidden.*
      - **ask, don't guess:** *whenever a task body or stage asks the user to choose/confirm something you cannot answer from the case prompt + data model alone (screen type, which entities, component plan, layout decisions), STOP and return `status: needs_user` with the workflow name, the stage, and the exact question(s). Do NOT invent an answer.*
      - report contract: return `status: needs_user` (with questions) or `status: stage_done` plus the stage's `RESPONSE` JSON and one line on what it produced — no task bodies, rule text, or file contents.
   3. **Between stages** read only the returned `RESPONSE` JSON to decide the next stage (it carries `stage_complete` and the `next` stage). The final `workflow done` returns `{ "stage": "done" }`; if the workflow declares `after:` hooks it also emits a `NEXT_WORKFLOWS:` line naming the auto-created child workflows — drive each the same per-stage way, and the parent cascades to archived once its children finish. (Validation is **not** an after-hook: `design-verify` / `sync-verify` run as a separate `--validate` step — see step 5 — unless the case prompt already ran that workflow.)

   **Interactive loop.** When a stage subagent returns:
   - `needs_user` → relay its question(s) to the user verbatim, get the answer, then dispatch a **fresh** subagent for the **same** stage told to resume it (state is on disk — `workflow instructions --stage` re-surfaces it) with the user's answer in its context. Repeat until the stage returns `stage_done`.
   - `stage_done` → move to the next stage.
   - when the last stage (and any after-hook child) is done → relay the final `workflow summary --json` to the user.

   **Single-driver mode (debug only).** With `--single-driver`, fall back to the old behavior: dispatch **one** subagent to drive the whole lifecycle inline in its own context (`workflow create` → task loop → `workflow done`), running every stage inline including `isolate: true` stages, and returning `status: needs_user` or `status: done` + the final `workflow summary --json`. Same storybook-restart mandate applies. Use this only to debug the workflow itself, not for measured runs.
5. If **no**: Tell the user the workspace is ready for manual use

Use `_debo storybook stop` (from the theme dir) to stop Storybook when the session ends or the user requests it.

## 5. Validate (optional — only if `--validate <workflow>` was passed)

Skip this step entirely when no `--validate` option was given.

**Skip when the main prompt already ran the same validate workflow.** If the case `prompt` already instructs running `/debo <validate-workflow>` (e.g. PART B runs `sync-verify`) and that workflow is archived `completed`, do not re-run it; go to step 6 with that id.

**Gates by validate workflow:**

| Validate workflow | Proceed when |
|---|---|
| `design-verify` (scores vs design reference) | Case prompt has a `reference_url` (or equivalent). Otherwise report skipped (no reference) and continue to step 6. |
| `sync-verify` (scores backend vs Storybook) | Storybook is running and the main-run summary (or case) names the story/scene. No design `reference_url` required. |

After the main workflow reaches `done`, run the validate workflow as a **separate** workflow against the story the main run produced. Dispatch a **fresh** driver subagent (the main run's driver has already returned) and give it:
- `workspaces/<suite>` as its working directory (workspace root),
- the case `prompt` verbatim (so the driver has case inputs — a fresh subagent starts with empty context and cannot see this thread),
- the just-completed main run's `workflow summary --json` output (so the driver knows the scene/story id that was produced),
- the task: *run the `<validate-workflow>` workflow to validate the story the main run produced. For `design-verify`, pass the `reference_url` from the case prompt. For `sync-verify`, resolve `story` / `kind` / page URL from the case prompt + main-run summary. Do NOT ask any questions the case prompt + the main-run summary already answer.*
- the same lifecycle instruction as step 4 (drive `workflow create` → task loop → `workflow done` inline; run `isolate: true` stages inline yourself),
- the same **ask, don't guess** rule and **report contract** as step 4.

Run the same **interactive loop** as step 4: relay `needs_user` questions to the user and resume with a fresh driver until `done`, then relay the validate summary. Note the validate workflow's own id (from `workflow list --workflow <validate-workflow> --include-archived`) for step 6.

## 6. Workflow summary (after workflow completion)

After the workflow completes, retrieve and display the summary from the **workspace root**:

```bash
cd workspaces/<suite>
npx storybook-addon-designbook workflow summary --workflow <id> --json
```

Display the full JSON output so the user can review scores before deciding on a snapshot. When a validate workflow ran (step 5), display its summary too, passing that run's id as `<id>`.

## 7. Snapshot offer

After the workflow completes:

1. `cd` into the theme dir (`workspaces/<suite>/web/themes/custom/test_integration_drupal`) — that is the git repo root for the workspace
2. Run `git diff --name-only` and `git ls-files --others --exclude-standard` to find changed/new files
3. Exclude `.agents/`, `.claude/`, `.storybook/`, `node_modules/` from the list
4. Also list new config under `workspaces/<suite>/web/sites/default/files/sync/` when present (outside the theme git root — report paths relative to workspace root)
5. Display the list of changed files to the user
6. Ask: "Save as fixture? Enter name (default: <case>) or 'n' to skip"
7. If the user provides a name (or accepts default):
   - For each changed/new file under the theme, copy it to `fixtures/<suite>/<fixture-name>/` preserving the theme-relative path
   - Report: "✓ Fixture saved to fixtures/<suite>/<fixture-name>/"
8. If the user declines: do nothing, workspace remains
