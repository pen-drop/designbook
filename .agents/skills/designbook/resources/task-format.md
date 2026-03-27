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
    title: Create Component: button
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
    config_rules:                  # strings from designbook.config.yml → workflow.rules.<stage>
      - "Komponenten-Namen immer auf Englisch, kebab-case"
    config_instructions:           # strings from designbook.config.yml → workflow.tasks.<stage>
      - "Nach Erstellung prüfen ob die Komponente im Storybook ohne Fehler rendert"
    started_at:
    completed_at:
    files:
      - path: /tmp/designbook-{name}/packages/.../components/button/button.component.yml
        requires_validation: true  # files: paths point to WORKTREE during workflow execution
```

**`files:` vs `reads:` in task files:**

- `files:` — output paths using `DESIGNBOOK_DIRS_*` env vars (e.g. `$DESIGNBOOK_HOME`, `$DESIGNBOOK_DIRS_COMPONENTS`). CLI remaps these vars to WORKTREE at plan time — subagents write to WORKTREE, Storybook sees nothing until workflow completes.
- `reads:` — input paths using real `DESIGNBOOK_HOME`-relative vars. Never remapped — always point to the actual filesystem so subagents can read pre-existing files.

## Directory Structure

```
$DESIGNBOOK_HOME/
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
