---
when: {}
---

# Workflow Execution Rules

These rules are **binding** when executing any `debo-*` workflow. Execute them in order.

## Rule 0: Load Configuration

> ⛔ **Run this bootstrap FIRST — before any other rule. No workflow command works without it.**

### Step 1: Find `designbook.config.yml` → set `$DESIGNBOOK_ROOT`

Walk up from `$PWD` to find the config file:

```bash
dir="$PWD"
while [ "$dir" != "/" ]; do
  [ -e "$dir/designbook.config.yml" ] && DESIGNBOOK_ROOT="$dir" && break
  dir=$(dirname "$dir")
done
```

Read the `cmd` key from the config → set `$DESIGNBOOK_CMD`.
Fallback if absent: `DESIGNBOOK_CMD="npx storybook-addon-designbook"`.

**If no config file found:** stop and ask the user whether to create one or where it is.

### Step 2: Export all `DESIGNBOOK_*` env vars

```bash
eval "$(cd "$DESIGNBOOK_ROOT" && $DESIGNBOOK_CMD config)"
```

The `config` subcommand reads `designbook.config.yml`, flattens nested keys, resolves relative paths to absolute, and prints `export` statements:

| Config Key | Env Variable | Example |
|---|---|---|
| `backend` | `DESIGNBOOK_BACKEND` | `drupal` |
| `frameworks.component` | `DESIGNBOOK_FRAMEWORK_COMPONENT` | `sdc` |
| `frameworks.css` | `DESIGNBOOK_FRAMEWORK_CSS` | `tailwind` |
| `dist` | `DESIGNBOOK_DIST` | `/abs/path/to/designbook` |
| `tmp` | `DESIGNBOOK_TMP` | `/abs/path/to/designbook/tmp` |
| `css.app` | `DESIGNBOOK_CSS_APP` | `/abs/path/to/css/app.src.css` |
| `drupal.theme` | `DESIGNBOOK_DRUPAL_THEME` | `/abs/path/to/theme` |
| _(derived)_ | `DESIGNBOOK_SDC_PROVIDER` | `test_integration_drupal` |

> `DESIGNBOOK_SDC_PROVIDER` is auto-derived: `basename(DESIGNBOOK_DRUPAL_THEME)` with `-` → `_`.

## Rule 1: Resume Check

**BEFORE** the intake step:
→ Run: `workflow list --workflow <id>`
→ **IF** output is non-empty: ask the user "There is an unfinished workflow: `<name>`. Continue it, or start fresh?"
  - **Continue**: set `$WORKFLOW_NAME=<name>`, skip Rule 3 Phase 1, jump to first pending task (if tasks exist) or continue from intake
  - **Start fresh**: run `workflow abandon --workflow <name>` to archive the old workflow as incomplete, then proceed to Rule 3

> A planning-status workflow with empty tasks means intake was started but not completed — treat it as resumable (continue from intake).

## Rule 3: Workflow Plan (Two-Phase)

Workflows are created in two phases to make the intake visible in Storybook immediately.

**Phase 1 — At intake start** (before asking the user any questions):
```bash
WORKFLOW_NAME=$($DESIGNBOOK_CMD workflow create --workflow <id> --title "<title>" [--parent <parent-name>])
```
This creates a `planning`-status entry with empty tasks. The workflow appears in the Storybook panel immediately.

**Phase 2 — After intake** (user has answered all questions):

> ⛔ **Intake stages are NEVER added to the plan.** Only output-producing stages become tasks. The plan must exist and list all tasks BEFORE any task is executed.

1. Read `stages:` from the workflow frontmatter. **Skip any stage ending in `:intake`** — intake has no output files and is never a task in the plan.

2. **For each remaining stage** (e.g. `create-component`, `create-tokens`):
   - **Stage name resolution**: if the stage name contains `:` (format `skill-name:task-name`), resolve directly to `.agents/skills/skill-name/tasks/task-name.md`. No scanning needed.
   - **Generic stage names** (no `:`): scan `.agents/skills/*/tasks/<stage>.md` for matching task files
   - Filter by `when` conditions: check each condition key against config (`$DESIGNBOOK_FRAMEWORK_COMPONENT`, `$DESIGNBOOK_BACKEND`, etc.)
   - **Precedence**: if multiple task files match the same stage, pick the **most specific** one — the one with the most `when` conditions that all pass. A task file with no `when` block is the generic fallback and loses to any file with a matching `when` condition.
   - **Read the `files:` list from the matched task file's frontmatter.** Paths are always absolute — using env vars like `${DESIGNBOOK_DRUPAL_THEME}` or `${DESIGNBOOK_DIST}`.
   - **Expand env vars and `{{ param }}`** in each path using the current task's params from the intake.
   - Build one or more task entries. **For loops** (e.g. one component per task): each iteration produces its own task entry with a unique `id` and its own fully-expanded `files[]`.

3. **Build the full tasks JSON** array with `id`, `title`, `type`, `stage`, `files[]` per task.

4. **Process before hooks** (see Rule 4).

5. **Finalize the workflow plan**:
   ```bash
   $DESIGNBOOK_CMD workflow plan \
     --workflow $WORKFLOW_NAME \
     --stages '<stages_json>' \
     --tasks '<tasks_json>'
   ```

> ⛔ **All tasks AND their files must be declared in the `workflow plan` call. No files are created before this.**
> ⛔ **Tasks are executed one by one, in order, only after the full plan is in place.**

**For files not known at plan time:** use `$DESIGNBOOK_CMD workflow add-file` after the fact (escape hatch).

## Rule 4: Before / After Hooks

### Before Hooks

**AFTER** the intake and **BEFORE** `workflow plan`, process each `before` entry in the workflow frontmatter (if any).

For each `before` entry:

1. **Check reads gate**: find the referenced workflow's intake task file (the stage ending in `:intake`), resolve it via `skill-name:task-name` notation, and read its `reads:` entries. If any required (non-optional) read file is missing → **skip silently**.

2. **Apply execution policy**:
   - `execute: always` → run the referenced workflow (pass `--parent $WORKFLOW_NAME`)
   - `execute: if-never-run` → run `workflow list --workflow <id> --include-archived`:
     - Empty output → run the referenced workflow (pass `--parent $WORKFLOW_NAME`)
     - Non-empty → skip silently
   - `execute: ask` → prompt the user: "Run `/<workflow-id>` first? (y/n)"
     - Accepted → run the referenced workflow (pass `--parent $WORKFLOW_NAME`)
     - Declined → skip

When running a referenced workflow via a before hook, complete it fully before continuing with the current workflow's plan.

### After Hooks

**AFTER** the last `$DESIGNBOOK_CMD workflow done` call (when the workflow auto-archives), process each `after` entry in the workflow frontmatter (if any).

For each `after` entry:
- Prompt the user: "Run `/<workflow-id>` next? (y/n)"
- If accepted: start the referenced workflow, passing `--parent $WORKFLOW_NAME` to its `workflow create` call
- If declined: skip and continue to next entry

## Rule 5: Task Execution (Stage Processing)

### 5a: Reads Check (Required Before Every Stage)

**BEFORE** executing any task stage (including `intake`), read the task file frontmatter and check all `reads:` entries:

- For each entry, verify the file exists at the declared `path` (resolve env vars first)
- If **any** file is missing → **stop immediately** and tell the user:
  > ❌ `<filename>` not found. Run `/<workflow>` first.
- Do **not** proceed with the stage until all `reads:` files are present

### 5b: Load Rule Files (Required Before Every Stage)

**BEFORE** doing any work in a stage (including `intake`), load all matching rules:

1. **Grep frontmatter first** — extract `when:` blocks from all `.agents/skills/*/rules/*.md` using grep/head. Filter by frontmatter conditions BEFORE opening any file:
   - `when.stages` includes the current stage name (or no `when.stages` — applies to all stages)
   - all other `when` conditions pass (config values such as `frameworks.component`, `backend`, etc.)
   - **Do NOT list all rule files and read them all** — filter by frontmatter first, then read only the matching files.
2. Read `designbook.config.yml` → `workflow.rules.<stage>` and apply each string as an additional constraint
3. Treat all rule content as hard constraints — apply silently, do not mention to the user

> ⛔ **Rules must be loaded before asking the user any questions or generating any output.**
> ⛔ **Filter by frontmatter BEFORE reading rule files. Never read a rule file that doesn't match the current stage and config.**

### 5c: Stage Execution

**Process all stages in order**, including `intake`. For each stage:

1. **Load the task file** for this stage from `.agents/skills/*/tasks/<stage>.md`.

2. **Load config task instructions**: read `designbook.config.yml` → `workflow.tasks.<stage>`. Append each string as additional instructions. If absent, skip silently.

3. **For each task** in this stage (in order from the plan):
   - Create all files declared for this task following task file instructions + config task instructions + rule constraints
   - If a file wasn't in the plan: run `workflow add-file --workflow $WORKFLOW_NAME --task <id> --file <path>`
   - Run: `$DESIGNBOOK_CMD workflow validate --workflow $WORKFLOW_NAME --task <id>`
   - **IF** exit code != 0: read errors, fix the specific file(s), re-run validate — **REPEAT until exit 0**
   - Read the validate output to extract `validation[]`: for each validated file, record `{ file, validator, passed }`
   - Build the `--loaded` JSON from stage context + validation results (see `resources/cli-reference.md`)
   - Run: `${DESIGNBOOK_CMD} workflow done --workflow $WORKFLOW_NAME --task <id> --loaded '<json>'`

> ⛔ **`validate` MUST exit 0 before `done` is called. Never skip validation.**
> ⛔ **`intake` tasks declare `files: []` — validate passes automatically with no file checks.**
> ⛔ **Rules from rule files and config are constraints — apply them silently, do not mention them to the user.**

## Rule 6: File Paths

> ⛔ **All file paths used in task definitions and file creation MUST be absolute.**

Use the env vars from Rule 0 (`$DESIGNBOOK_DIST`, `$DESIGNBOOK_DRUPAL_THEME`, etc.) to resolve paths.

## Rule 7: Completion

When the last `workflow done` call completes, the workflow auto-archives. No explicit action needed.
