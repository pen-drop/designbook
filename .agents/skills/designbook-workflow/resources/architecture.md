# Workflow Architecture

## Stage-Based Architecture

Workflows declare a `stages:` array in their frontmatter. Each non-intake stage maps to task files discovered in `.agents/skills/*/tasks/<stage>.md`. Rule files at `.agents/skills/*/rules/<name>.md` apply contextual constraints.

```yaml
# workflow frontmatter
workflow:
  title: Design Shell
  stages: [intake, create-component, create-shell-scene]
```

The `intake` stage is the workflow body itself (interviews the user). All other stages are executed via skill task files.

**Named intake stages**: use `workflow-id:intake` (e.g. `debo-design-tokens:intake`) when rules should apply specifically to one workflow's intake without affecting other workflows.

## Integration Pattern

```
1. Run intake (workflow body) → collect params
2. Rule 1: scan skills for task files per stage → build JSON → workflow create --stages --tasks
3. Rule 2: per task → load task file + rules → create files → validate --task → done --task
```

## Task File Format (skills)

Task files live at `.agents/skills/<skill-name>/tasks/<stage-name>.md`. The filename is the canonical stage name:

```markdown
---
when:
  frameworks.component: sdc   # optional — filter condition
params:
  component: ~               # ~ means required (from intake)
  slots: []
files:
  - ${DESIGNBOOK_DRUPAL_THEME}/components/{{ component }}/{{ component }}.component.yml
  - ${DESIGNBOOK_DRUPAL_THEME}/components/{{ component }}/{{ component }}.twig
---
# Task instructions go here
```

- `when` conditions filter which task file applies
- `files` paths are always absolute — using env vars with `{{ param }}` substitution by the AI at plan time
- A task file with no `when` block applies universally

**`when` condition keys:**
- `frameworks.component` → `$DESIGNBOOK_FRAMEWORK_COMPONENT`
- `backend` → `$DESIGNBOOK_BACKEND`
- `frameworks.css` → `$DESIGNBOOK_FRAMEWORK_CSS`

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

- `stages:` accepts a single value or an array
- Without `when.stages`: rule applies to all stages
- **Named intake stages**: use `workflow-id:intake` to scope a rule to a specific workflow's intake

## Storybook Integration

- Vite plugin watches `workflows/changes/` for file changes
- New `tasks.yml` → Storybook panel update
- Tasks in same stage appear grouped under a stage label in the Panel
- All tasks done → panel update + archive notification
- Panel polls `/__designbook/workflows` for progress display
- Storybook is **display only** — all validation logic runs in the CLI
