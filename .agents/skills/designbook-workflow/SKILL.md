
---
name: designbook-workflow
description: Manages workflow task tracking via CLI commands. Stage-based: reads stages from workflow frontmatter, discovers task files per stage, executes with validate + done per task.
---

# Designbook Workflow Tracking

> Tracks AI workflow progress via CLI commands. Storybook's panel polls these files and shows notifications on task completion.

## Stage-Based Architecture

Workflows declare a `stages:` array in their frontmatter. Each non-dialog stage maps to task files discovered in `.agents/skills/*/tasks/<stage>.md`. Rule files at `.agents/skills/*/rules/<name>.md` apply contextual constraints.

```yaml
# workflow frontmatter
workflow:
  title: Design Shell
  stages: [dialog, create-component, create-shell-scene]
```

The `dialog` stage is the workflow body itself (interviews the user). All other stages are executed via skill task files.

**Named dialog stages**: use `workflow-id:dialog` (e.g. `debo-design-tokens:dialog`) when you need rules to apply specifically to one workflow's dialog without affecting other workflows. A rule scoped to `debo-design-tokens:dialog` will only fire during that workflow's conversation stage.

## Integration Pattern

```
1. Run dialog (workflow body) → collect params
2. Rule 1: scan skills for task files per stage → build JSON → workflow create --stages --tasks
3. Rule 2: per task → load task file + rules → create files → validate --task → done --task
```

## CLI Commands

```bash
# Early creation (dialog phase — no tasks yet)
${DESIGNBOOK_CMD} workflow create --workflow <id> --title "<title>" [--parent <name>]
# → returns $WORKFLOW_NAME; creates planning-status tasks.yml with empty tasks

# Plan (after dialog — adds tasks to existing planning workflow)
${DESIGNBOOK_CMD} workflow plan --workflow $WORKFLOW_NAME --stages '<json>' --tasks '<json>'

# Full creation in one call (skip dialog status)
${DESIGNBOOK_CMD} workflow create --workflow <id> --title "<title>" --stages '<json>' --tasks '<json>'
${DESIGNBOOK_CMD} workflow create --workflow <id> --title "<title>" --tasks-file <path>

# List workflows for an id
${DESIGNBOOK_CMD} workflow list --workflow <id>
${DESIGNBOOK_CMD} workflow list --workflow <id> --include-archived

# Execution (2 calls per task)
${DESIGNBOOK_CMD} workflow validate --workflow <name> --task <id>
${DESIGNBOOK_CMD} workflow done     --workflow <name> --task <id>

# Escape hatch: add file not known at plan time
${DESIGNBOOK_CMD} workflow add-file --workflow <name> --task <id> --file <path>
```

## Task JSON Format

Each task entry includes the `stage` field (canonical stage name) and may have a `type` and `files[]`:

```json
[
  {
    "id": "create-page",
    "title": "Create page component",
    "type": "component",
    "stage": "create-component",
    "files": [
      "components/page/page.component.yml",
      "components/page/page.twig",
      "components/page/page.story.yml"
    ]
  },
  {
    "id": "create-scene",
    "title": "Create design system scene",
    "type": "scene",
    "stage": "create-shell-scene",
    "files": ["design-system/design-system.scenes.yml"]
  }
]
```

File paths are absolute (resolved env vars). The CLI normalizes them to paths relative to `$DESIGNBOOK_DIST` internally.

## Task File Format (skills)

Task files live at `.agents/skills/<skill-name>/tasks/<stage-name>.md`. The filename is the canonical stage name:

```markdown
---
when:
  frameworks.component: sdc   # optional — filter condition
params:
  component: ~               # ~ means required (from dialog)
  slots: []
files:
  - ${DESIGNBOOK_DRUPAL_THEME}/components/{{ component }}/{{ component }}.component.yml
  - ${DESIGNBOOK_DRUPAL_THEME}/components/{{ component }}/{{ component }}.twig
---
# Task instructions go here
```

**`files` paths are always absolute** — using env vars like `${DESIGNBOOK_DRUPAL_THEME}` or `${DESIGNBOOK_DIST}`. No relative paths.

**`when` conditions** filter which task file applies. Keys map to config values:
- `frameworks.component` → `$DESIGNBOOK_FRAMEWORK_COMPONENT`
- `backend` → `$DESIGNBOOK_BACKEND`
- `frameworks.css` → `$DESIGNBOOK_FRAMEWORK_CSS`

A task file with no `when` block applies universally.

**`files`** are paths relative to `$DESIGNBOOK_DIST` with `{{ param }}` substitution done by the AI at plan time.

## Rule File Format (skills)

Rule files live at `.agents/skills/<skill-name>/rules/<name>.md`. They define constraints scoped to one or more stages:

```markdown
---
when:
  stages: [create-component, create-shell-scene]   # one or more canonical stages
  frameworks.component: sdc                         # optional additional condition
---
# Rule constraints go here (prose — never execution steps)
```

`stages:` accepts a single value or an array.

**Named dialog stages**: use `workflow-id:dialog` to scope a rule to a specific workflow's dialog — e.g. `stages: [debo-design-tokens:dialog, create-tokens]`. This prevents the rule from firing in other workflows that also have a `dialog` stage.

## Task Types

| Type | Used for |
|------|----------|
| `component` | Creating/updating UI components |
| `scene` | Creating/updating scenes.yml |
| `data` | Creating/updating data.yml, vision.md, etc. |
| `tokens` | Creating/updating design tokens |
| `view-mode` | Creating/updating view mode mappings |
| `css` | Generating CSS token files |
| `validation` | Running validation commands |

## Directory Structure

```
$DESIGNBOOK_DIST/
└── workflows/
    ├── changes/          # Active workflows
    │   └── [name]/
    │       └── tasks.yml
    └── archive/          # Completed workflows
        └── [name]/
            └── tasks.yml
```

## tasks.yml Format

```yaml
title: Design Shell
workflow: debo-design-shell
status: running                    # planning | running | completed | incomplete
parent: debo-design-tokens-2026-03-18-a3f7   # optional — set when triggered via a hook
stages:
  - dialog
  - create-component
  - create-shell-scene
started_at: 2026-03-12T18:30:00
completed_at:
tasks:
  - id: create-page
    title: Create page component
    type: component
    stage: create-component
    status: pending                # pending | in-progress | done | incomplete
    started_at:
    completed_at:
    files:
      - path: components/page/page.component.yml
        requires_validation: true
```

## Storybook Integration

- Vite plugin watches `workflows/changes/` for file changes
- New `tasks.yml` → Storybook panel update
- Tasks in same stage appear grouped under a stage label in the Panel
- All tasks done → panel update + archive notification
- Panel polls `/__designbook/workflows` for progress display
- Storybook is **display only** — all validation logic runs in the CLI

## AI Rules

These rules are **binding** when executing any workflow.

### Rule 0: Resume Check
**BEFORE** the dialog step:
→ Run: `workflow list --workflow <id>`
→ **IF** output is non-empty: ask the user "There is an unfinished workflow: `<name>`. Continue it, or start fresh?"
  - **Continue**: set `$WORKFLOW_NAME=<name>`, skip Rule 1, jump to first pending task (if tasks exist) or continue from dialog
  - **Start fresh**: run `workflow abandon --workflow <name>` to archive the old workflow as incomplete, then proceed to Rule 1

> A planning-status workflow with empty tasks means dialog was started but not completed — treat it as resumable (continue from dialog).

### Rule 1: Workflow Plan (Two-Phase)

Workflows are created in two phases to make the dialog visible in Storybook immediately.

**Phase 1 — At dialog start** (before asking the user any questions):
```bash
WORKFLOW_NAME=$(workflow create --workflow <id> --title "<title>"  [--parent <parent-name>])
```
This creates a `planning`-status entry with empty tasks. The workflow appears in the Storybook panel immediately.

**Phase 2 — After dialog** (user has answered all questions):

1. Read `stages:` from the workflow frontmatter. Skip `dialog` — it has no task files.

2. **For each remaining stage** (e.g. `create-component`, `create-tokens`):
   - Scan `.agents/skills/*/tasks/<stage>.md` for matching task files
   - Filter by `when` conditions: check each condition key against config (`$DESIGNBOOK_FRAMEWORK_COMPONENT`, `$DESIGNBOOK_BACKEND`, etc.)
   - **Precedence**: if multiple task files match the same stage, pick the **most specific** one — the one with the most `when` conditions that all pass. A task file with no `when` block is the generic fallback and loses to any file with a matching `when` condition. Example: `designbook-css-daisyui/tasks/create-tokens.md` (`when: frameworks.css: daisyui`) takes precedence over `designbook-tokens/tasks/create-tokens.md` (no `when`) when `DESIGNBOOK_FRAMEWORK_CSS=daisyui`.
   - **Read the `files:` list from the matched task file's frontmatter.** Paths are always absolute — using env vars like `${DESIGNBOOK_DRUPAL_THEME}` or `${DESIGNBOOK_DIST}`.
   - **Expand env vars and `{{ param }}`** in each path using the current task's params from the dialog — this substitution is done by the AI, no runtime engine.
   - Build one or more task entries. **For loops** (e.g. one component per task): each iteration produces its own task entry with a unique `id` and its own fully-expanded `files[]` using that iteration's specific param values.

3. **Build the full tasks JSON** array with `id`, `title`, `type`, `stage`, `files[]` per task.

4. **Process before hooks** (see Rule: Before Hooks).

5. **Finalize the workflow plan**:
   ```bash
   workflow plan \
     --workflow $WORKFLOW_NAME \
     --stages '<stages_json>' \
     --tasks '<tasks_json>'
   ```

> ⛔ **All tasks AND their files must be declared in the `workflow plan` call. No files are created before this.**

**For files not known at plan time:** use `workflow add-file` after the fact (escape hatch).

### Rule: Before Hooks

**AFTER** the dialog and **BEFORE** `workflow plan`, process each `before` entry in the workflow frontmatter (if any).

For each `before` entry:

1. **Check reads gate**: look up the referenced workflow's `reads:` entries. If any required (non-optional) read file is missing → **skip silently**.

2. **Apply execution policy**:
   - `execute: always` → run the referenced workflow (pass `--parent $WORKFLOW_NAME`)
   - `execute: if-never-run` → run `workflow list --workflow <id> --include-archived`:
     - Empty output → run the referenced workflow (pass `--parent $WORKFLOW_NAME`)
     - Non-empty → skip silently
   - `execute: ask` → prompt the user: "Run `/<workflow-id>` first? (y/n)"
     - Accepted → run the referenced workflow (pass `--parent $WORKFLOW_NAME`)
     - Declined → skip

When running a referenced workflow via a before hook, complete it fully before continuing with the current workflow's plan.

### Rule: After Hooks

**AFTER** the last `workflow done` call (when the workflow auto-archives), process each `after` entry in the workflow frontmatter (if any).

For each `after` entry:
- Prompt the user: "Run `/<workflow-id>` next? (y/n)"
- If accepted: start the referenced workflow, passing `--parent $WORKFLOW_NAME` to its `workflow create` call
- If declined: skip and continue to next entry

### Rule 2a: Reads Check (Required Before Every Stage)

**BEFORE** executing any task stage, read the task file frontmatter and check all `reads:` entries:

- For each entry, verify the file exists at the declared `path` (resolve env vars first)
- If **any** file is missing → **stop immediately** and tell the user:
  > ❌ `<filename>` not found. Run `/<workflow>` first.
- Do **not** proceed with the stage until all `reads:` files are present

### Rule 2: Task Execution (Stage Processing)

**Process stages in order** (skip `dialog`). For each stage:

1. **Load the task file** for this stage from `.agents/skills/*/tasks/<stage>.md` (same file identified in Rule 1).

2. **Load matching rule files**: scan `.agents/skills/*/rules/*.md`, filter to rules where:
   - `when.stages` includes the current stage name (or no `when.stages` — applies to all stages)
   - all other `when` conditions pass (config values)
   - Apply all loaded rules as constraints throughout this stage's execution

3. **Load config task instructions**: read `designbook.config.yml` → `workflow.tasks.<stage>`. Append each string as additional instructions to the task file content. If the key is absent, skip silently.

4. **For each task** in this stage (in order from the plan):
   - Create all files declared for this task following the task file instructions + config task instructions + rule constraints
   - If a file wasn't in the plan: run `workflow add-file --workflow $WORKFLOW_NAME --task <id> --file <path>`
   - Run: `workflow validate --workflow $WORKFLOW_NAME --task <id>`
   - **IF** exit code != 0: read errors, fix the specific file(s), re-run validate — **REPEAT until exit 0**
   - Run: `workflow done --workflow $WORKFLOW_NAME --task <id>`

> ⛔ **`validate` MUST exit 0 before `done` is called. Never skip validation.**
> ⛔ **Rules from rule files and config are constraints — they must be applied silently, not mentioned to the user.**

### Rule 3: Completion

When the last `workflow done` call completes, the workflow auto-archives. No explicit action needed.

### Rule 4: Rule Auto-Loading

Rule files are loaded automatically. They must NOT be loaded by the AI manually. The AI should:
- Scan `.agents/skills/*/rules/*.md` at the start of each stage
- Apply all rules that pass `when` conditions
- Read `designbook.config.yml` → `workflow.rules.<stage>` and apply each string as an additional constraint alongside skill rule files. If the key is absent, skip silently.
- Treat all rule content (from files and config) as hard constraints (not suggestions)

**Dialog stage**: At the start of the dialog (before asking the user any questions), also scan for rules where `when.stages` contains `<workflow-id>:dialog` (e.g. `debo-data-model:dialog`). Also read `workflow.rules["<workflow-id>:dialog"]` from config. Apply all matching rules as constraints throughout the entire dialog conversation.

## Workflow Frontmatter: `before` and `after` Hooks

Declare hooks in the YAML frontmatter of any `debo-*.md` workflow:

```yaml
before:
  - workflow: /debo-css-generate
    execute: if-never-run    # always | if-never-run | ask

after:
  - workflow: /debo-css-generate
    # no execute field — after hooks always ask
```

- **`before`**: runs after the current workflow's dialog, before `workflow plan`. Requires an `execute` policy.
  - `always` — run unconditionally (if reads are satisfied)
  - `if-never-run` — run only if `workflow list --include-archived` returns empty
  - `ask` — prompt the user
- **`after`**: suggests a follow-up workflow after the last `workflow done`. Always prompts the user.
- Both: if the referenced workflow's required `reads:` are unsatisfied, skip silently regardless of policy.
- Both: pass `--parent $WORKFLOW_NAME` when triggering the hook workflow.

### Status Transitions (Automatic)
The CLI automatically handles:
- `planning` → set by `workflow create` (with or without tasks)
- `planning` → `running`: on first `workflow validate` call
- `running` → `completed`: when all tasks are done (workflow auto-archives)
- `running` → `incomplete`: when user declines to resume (`workflow abandon` → archives to `archive/`)

### Rule 5: Skill Loading (Required)

> ⛔ **This skill MUST be loaded via the Skill tool before executing any `debo-*` workflow.**
> Do not proceed with workflow plan creation or task execution until this skill is active in the conversation.

Each `debo-*` workflow declares Step 0 for this purpose. If a workflow is missing Step 0, load this skill immediately upon recognizing a `workflow:` frontmatter block.

### Rule 6: File Paths (Required)

> ⛔ **All file paths used in task definitions and file creation MUST be absolute.**
> Never hardcode paths. Always resolve using variables from `designbook-configuration`:

| Variable | Resolves to |
|---|---|
| `$DESIGNBOOK_DIST` | Base output directory (e.g. `packages/integrations/test-integration-drupal/designbook`) |
| `$DESIGNBOOK_DRUPAL_THEME` | Drupal theme directory (e.g. `packages/integrations/test-integration-drupal`) |
| `$DESIGNBOOK_FRAMEWORK_COMPONENT` | Component framework identifier |
| `$DESIGNBOOK_FRAMEWORK_CSS` | CSS framework identifier |

Load `designbook-configuration` before resolving any paths if values are not already known.
