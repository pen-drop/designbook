## Context

Workflow files like `debo-design-shell.md` currently embed all instructions inline. The SDC skill context is repeated in every workflow that creates components. Task files make execution units reusable; rule files make constraints reusable. Both are discovered by convention — no explicit linking needed.

This change builds on `workflow-cli-redesign` (plan-then-execute with `workflow create --tasks '<json>'`).

## Goals / Non-Goals

**Goals:**
- Task file convention: `skills/<name>/tasks/<stage-name>.md` — filename = stage it applies to
- Rule file convention: `skills/<name>/rules/<anything>.md` — always loaded for stages in that skill, `when` filters
- Frontmatter: only `when` (config conditions), `params`, `files` — no `used_by`
- Workflow frontmatter: only `stages` array — no `task_files` map
- Discovery: AI finds task files by scanning for `tasks/<stage>.md` across all skills, filters by `when`
- tasks.yml: flat, each task has a `stage` field; top-level `stages` array for ordering
- Storybook groups tasks by stage using `stages` array for order

**Non-Goals:**
- Runtime template engine — param substitution done by AI
- Parallel execution enforcement — within a stage, order is free
- Central task/rule registry — pure filesystem convention

## Decisions

### Decision: Filename = stage name for task files

`tasks/create-component.md` applies to stage `create-component`. No declaration needed. The AI scans all skill directories for `tasks/<stage>.md` when executing a stage.

This means stage names are the shared interface between workflows and skills. They must be consistent and semantic:

```
create-component    create-scene    create-data-model
create-tokens       create-css      create-sample-data
```

### Decision: No used_by — discovery is purely structural + config

Task and rule files do not declare which workflows use them. Discovery:

```
Stage: create-component
Config: { component.framework: sdc, backend: drupal }

Task files:  scan skills/*/tasks/create-component.md
             filter: when.component.framework = sdc  → match
             → load

Rule files:  scan skills/*/rules/*.md
             filter: when.stage = create-component (or absent) AND config matches
             → load all matching
```

Adding a new framework: create one task file with `when: { component.framework: react }`. No workflow changes.

### Decision: Workflow frontmatter is just stages

```yaml
workflow:
  title: Design Shell
  stages: [dialog, create-component, create-scene]
```

No `task_files` map. The workflow body describes the dialog and task-collection step. The AI knows what stages exist and discovers task files automatically.

### Decision: tasks.yml stays flat with stage field

```yaml
stages: [dialog, create-component, create-scene]
tasks:
  - id: create-page
    stage: create-component
    status: done
    files: [...]
  - id: create-header
    stage: create-component
    status: in-progress
    files: [...]
  - id: create-scene
    stage: create-scene
    status: pending
    files: [...]
```

### Decision: Rule files use when.stage to scope to specific stages

Rule files in `skills/<name>/rules/` are candidates for any stage. The `when.stage` field scopes them:

```yaml
# rules/drupal-field-naming.md
---
when:
  backend: drupal
  stage: create-data-model   # only applies during this stage
---
```

Without `when.stage`, the rule applies to all stages in that skill.

## Concrete Example — debo-design-shell

**Static files in repo:**
```
.agents/
  workflows/
    debo-design-shell.md          ← stages: [dialog, create-component, create-scene]

  skills/
    designbook-components-sdc/
      tasks/
        create-component.md       ← when: { component.framework: sdc }
      rules/
        sdc-slot-naming.md        ← when: { stage: create-component }

    designbook-scenes/
      tasks/
        create-shell-scene.md     ← no when (always applies)
```

**Task file frontmatter:**
```yaml
# tasks/create-component.md
---
when:
  component.framework: sdc
params:
  component: ~
  slots: []
  group: ~
files:
  - components/{{ component }}/{{ component }}.component.yml
  - components/{{ component }}/{{ component }}.twig
  - components/{{ component }}/{{ component }}.story.yml
---
```

**Runtime flow:**
1. Stage `dialog` → user dialog → AI knows: page, header, footer
2. AI scans skills for `tasks/create-component.md` → finds sdc version (config matches)
3. AI builds 3 task entries + 1 scene entry with substituted params
4. `workflow create --tasks '<json>'`
5. Stage `create-component` → execute page, header, footer (any order)
6. Stage `create-scene` → execute scene

## Risks / Trade-offs

- **Stage name collisions** → Two skills both have `tasks/create-component.md` without a differentiating `when` → both loaded. Mitigation: `when` is the disambiguator; each framework-specific task file must have a `when` condition.
- **Discovery requires scanning skill directories** → AI must know where to look. Mitigation: SKILL.md documents the scan path.
- **Stage name drift** → Workflow declares `create-components` (plural), task file is `create-component` (singular) → no match. Mitigation: documented canonical stage names in SKILL.md.
