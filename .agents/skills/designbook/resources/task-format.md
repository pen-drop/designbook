# Task & Workflow File Formats

## Task File Frontmatter — Structured File Declarations

Each task file declares output files with `key` and `validators`:

```yaml
---
files:
  - file: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
    key: component
    validators: [component]
  - file: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.twig
    key: template
    validators: []
---
```

- `file` — path template (supports `$ENV` and `{{ param }}`)
- `key` — stable identifier used by `write-file --key`
- `validators` — validator keys (`component`, `data-model`, `tokens`, `data`, `entity-mapping`, `scene`). Empty = auto-pass.

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
    files:
      - path: /tmp/designbook-{name}/packages/.../components/button/button.component.yml
        key: component
        validators: [component]
        # validation_result absent = file not yet written
        # validation_result present = file written + validated
```

**`files:` vs `reads:` in task files:**

- `files:` — output declarations with `key` and `validators`. The AI writes content via `workflow write-file --key <key>` (stdin). The engine decides where to write (stash for direct, WORKTREE for git-worktree). Validation runs immediately on write.
- `reads:` — input paths using real `DESIGNBOOK_DATA`-relative vars. Never remapped — always point to the actual filesystem so subagents can read pre-existing files.

**File state is derived from `validation_result`:**
- absent → not yet written
- `valid: true` → written + validated + OK
- `valid: false` → written + validated + errors (AI must fix and re-write)

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
