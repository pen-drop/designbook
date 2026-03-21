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
stages:
  - intake
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
