# Task & Workflow File Formats

## Task File Frontmatter — Unified Extension Model

Every task, rule, and blueprint file supports these frontmatter fields:

```yaml
---
name: designbook:design:screenshot           # namespaced identity (<skill>:<concern>:<artifact>)
as: designbook:design:resolve-reference      # optional: override the named artifact
priority: 10                                  # optional: execution order + override strength (default: 0)
trigger:                                      # optional: WHEN (OR-connected). Keys: steps, domain.
  steps: [screenshot]
filter:                                       # optional: WHERE (AND-connected). Keys: backend, frameworks.*, extensions, type.
  frameworks.css: tailwind
params:                                       # task-specific: declared parameters
  scene: ~
each:                                         # task-specific: iteration declaration
  checks:
    $ref: ../schemas.yml#/Check
result:                                       # task-specific: output declarations
  component-yml:                              # file result (has path:)
    path: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
    validators: [data]
  issues:                                     # data result (no path:)
    type: array
    items:
      $ref: ../schemas.yml#/Issue
---
```

- `name` — unique namespaced identity. Convention: `<skill>:<concern>:<artifact>`. Derived from filesystem path if omitted.
- `as` — override target. Replaces the named artifact if this artifact's `priority` is higher.
- `priority` — integer (default 0). Lower runs first. Higher wins in `as` conflicts.
- `trigger` — conditions that declare WHEN the artifact becomes active. Keys `steps` and `domain`
  are OR-connected (at least one must match). Evaluated against runtime context (step name,
  effective domains).
- `filter` — conditions that declare WHERE the artifact is applicable. Keys like `backend`,
  `frameworks.*`, `extensions`, `type` are AND-connected (every key must match). Evaluated against
  project config.
- `each` — declares what this task iterates over. Keys reference scope entries; values are JSON Schema (inline or `$ref`). The engine expands one task instance per array item.
- `result` — declares all task outputs. Each key is a stable identifier. File results include a `path:` template (supports `$ENV` and `{{ param }}`). Optional `flush: immediately` writes to final path on result write instead of staging. Data results declare a JSON Schema type (inline or `$ref`). Both support optional `validators:` for semantic validation.
- `validators` — semantic validator keys: `data`, `entity-mapping`, `scene`, `image`, or `cmd:<command>` prefix for arbitrary command validators. Empty = auto-pass.

### `$ref` syntax

Task frontmatter references schemas in `schemas.yml` files using `$ref`:

```yaml
$ref: ../schemas.yml#/TypeName
```

The path is relative to the task file. The fragment (`#/TypeName`) selects a PascalCase key from the schemas file. All `$ref` values are resolved and inlined at `workflow create` time -- unresolvable references cause a hard error.

### `schemas.yml` file format

Each skill concern can define a `schemas.yml` file with reusable JSON Schema (draft-07) definitions:

```yaml
# .agents/skills/<skill>/<concern>/schemas.yml
Check:
  type: object
  required: [storyId, breakpoint, region]
  properties:
    storyId: { type: string }
    breakpoint: { type: string }
    region: { type: string, enum: [full, header, footer] }

Issue:
  type: object
  required: [severity, description]
  properties:
    severity: { type: string, enum: [critical, major, minor] }
    description: { type: string }
```

Keys are PascalCase. Values are standard JSON Schema objects. Referenced from task frontmatter via `$ref: ../schemas.yml#/Check`.

## tasks.yml Format

```yaml
title: Design Shell
workflow: debo-design-shell
status: running                    # planning | running | completed | incomplete
parent: debo-design-tokens-2026-03-18-a3f7   # optional
write_root: /tmp/designbook-debo-design-shell-2026-03-26-a1b2/  # WORKTREE path (set at plan time)
root_dir: /home/cw/projects/designbook                           # DESIGNBOOK_HOME (for final copy)
params:                            # global intake params (from --params)
  section_id: dashboard
stages:
  - create-component
  - create-shell-scene
started_at: 2026-03-12T18:30:00
completed_at:
tasks:
  - id: create-component-button
    title: Button
    type: component
    stage: create-component
    status: pending                # pending | in-progress | done | incomplete
    depends_on: []                 # task IDs this task depends on
    params:                        # per-task params from intake
      component: button
      slots: [icon, label]
    task_file: /abs/path/.agents/skills/$DESIGNBOOK_COMPONENT_SKILL/tasks/create-component.md
    rules:                         # absolute paths to matched rule files
      - /abs/path/.agents/skills/designbook-css-daisyui/rules/daisyui-naming.md
    blueprints:                    # absolute paths to matched blueprint files (unique per type+name)
      - /abs/path/.agents/skills/designbook-drupal/blueprints/section.md
    config_rules:                  # strings from designbook.config.yml → workflow.rules.<stage>
      - "Komponenten-Namen immer auf Englisch, kebab-case"
    config_instructions:           # strings from designbook.config.yml → workflow.tasks.<stage>
      - "Nach Erstellung prüfen ob die Komponente im Storybook ohne Fehler rendert"
    started_at:
    completed_at:
    result:
      component-yml:
        path: /tmp/designbook-{name}/packages/.../components/button/button.component.yml
        validators: [data]
        # valid absent = result not yet written
        # valid: true = written + validated + OK
        # valid: false = written + validated + errors
      issues:
        type: array
        items: { ... }
        value: [...]                 # populated after workflow result --json
```

**`result:` vs `reads:` in task files:**

- `result:` — output declarations. File results (with `path:`) are written to disk; optional `flush: immediately` bypasses staging. Data results (without `path:`) are passed inline via `--data` on `workflow done`. The engine validates immediately on write (JSON Schema + semantic validators). Data results flow into scope at stage completion.
- `reads:` — input paths using real `DESIGNBOOK_DATA`-relative vars. Never remapped — always point to the actual filesystem so subagents can read pre-existing files.

**Result state:**
- `valid` absent → not yet written
- `valid: true` → written + validated + OK
- `valid: false` → written + validated + errors (AI must fix and re-write)

> **Deprecated:** `files:` still works as a legacy alias -- internally converted to `result:` entries with `path:`.

## Directory Structure

```
$DESIGNBOOK_DATA/
└── workflows/
    ├── changes/          # Active workflows
    │   └── [name]/
    │       └── tasks.yml
    └── archive/          # Completed workflows
        └── [name]/
            └── tasks.yml
```

## Before/After Hook Frontmatter

Declare in any `debo-*.md` workflow frontmatter:

```yaml
before:
  - workflow: /debo-css-generate
    execute: if-never-run    # always | if-never-run | ask

after:
  - workflow: /debo-css-generate
    # no execute field — after hooks always ask
```

- **`before`**: runs after intake, before `workflow plan`. Requires `execute` policy.
- **`after`**: suggests a follow-up after the last `workflow done`. Always prompts.
- Both: if referenced workflow's required `reads:` are unsatisfied, skip silently.
- Both: pass `--parent $WORKFLOW_NAME` when triggering the hook workflow.
