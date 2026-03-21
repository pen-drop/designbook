# Task & Workflow File Formats

## Task JSON Format

Each task entry in the `workflow plan` call:

```json
[
  {
    "id": "create-page",
    "title": "Create page component",
    "type": "component",
    "stage": "create-component",
    "files": [
      "/absolute/path/to/components/page/page.component.yml",
      "/absolute/path/to/components/page/page.twig",
      "/absolute/path/to/components/page/page.story.yml"
    ]
  },
  {
    "id": "create-scene",
    "title": "Create design system scene",
    "type": "scene",
    "stage": "create-shell-scene",
    "files": ["/absolute/path/to/designbook/design-system/design-system.scenes.yml"]
  }
]
```

## tasks.yml Format

```yaml
title: Design Shell
workflow: debo-design-shell
status: running                    # planning | running | completed | incomplete
parent: debo-design-tokens-2026-03-18-a3f7   # optional
params:                            # global intake params (from --params)
  section_id: dashboard
stages:
  - create-component
  - create-shell-scene
started_at: 2026-03-12T18:30:00
completed_at:
tasks:
  - id: create-component-button
    title: Create Component: button
    type: component
    stage: create-component
    status: pending                # pending | in-progress | done | incomplete
    depends_on: []                 # task IDs this task depends on
    params:                        # per-task params from intake
      component: button
      slots: [icon, label]
    task_file: /abs/path/.agents/skills/designbook-components-sdc/tasks/create-component.md
    rules:                         # absolute paths to matched rule files
      - /abs/path/.agents/skills/designbook-css-daisyui/rules/daisyui-naming.md
    config_rules:                  # strings from designbook.config.yml → workflow.rules.<stage>
      - "Komponenten-Namen immer auf Englisch, kebab-case"
    config_instructions:           # strings from designbook.config.yml → workflow.tasks.<stage>
      - "Nach Erstellung prüfen ob die Komponente im Storybook ohne Fehler rendert"
    started_at:
    completed_at:
    files:
      - path: /abs/path/components/button/button.component.yml
        requires_validation: true
```

### New Fields (Resolution Mode)

| Field | Level | Source | Description |
|---|---|---|---|
| `params` | top-level | `--params` | Global intake params accessible to all subagents |
| `params` | per-task | `--items[].params` | Task-specific params merged with task file defaults |
| `depends_on` | per-task | computed | Task IDs this task depends on (from stage ordering) |
| `task_file` | per-task | resolved | Absolute path to matched skill task file |
| `rules` | per-task | resolved | Absolute paths to matched skill rule files |
| `config_rules` | per-task | resolved | Strings from `designbook.config.yml` → `workflow.rules.<stage>` |
| `config_instructions` | per-task | resolved | Strings from `designbook.config.yml` → `workflow.tasks.<stage>` |

When `workflow plan` is called via the legacy interface (without `--workflow-file`), these fields are absent — existing behavior is unchanged.

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

## Status Transitions (Automatic)

The CLI handles these automatically:
- `planning` → set by `workflow create`
- `planning` → `running`: on first `workflow validate` call
- `running` → `completed`: when all tasks done (auto-archives)
- `running` → `incomplete`: when `workflow abandon` is called

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
