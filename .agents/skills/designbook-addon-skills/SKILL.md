---
name: designbook-skills
user-invocable: false
description: Meta-skill for creating and maintaining Designbook skills. Defines conventions for skill structure, tasks, rules, schema validation, and workflow integration. Load this skill ALWAYS if skills from designbook is about to be changed.
---

# Designbook Skills

This meta-skill documents the conventions for creating Designbook skills. Use it when building new skills or updating existing ones.

## Architecture

```
designbook skill             →  Addon skills (designbook-css-*, designbook-drupal, etc.)
  ↳ <concern>/workflows/       ↳ tasks/<stage>.md  — what to create
  ↳ <workflow-id>.md           ↳ rules/<name>.md   — constraints (conditional)
  ↳ steps: [intake, ...]
```

**Workflow files** live inside the `designbook` skill at `<concern>/workflows/<workflow-id>.md` and have simplified flat frontmatter:
```yaml
title: Design Shell
description: Design the application shell with header, content, and footer slots
stages:
  intake:
    steps: [intake]
  component:
    each: component
    steps: [create-component]
  scene:
    each: scene
    steps: [create-scene]
before:
  - workflow: css-generate
    execute: if-never-run
```

After dialog, the AI:
1. Reads `stages` from frontmatter
2. For each non-dialog stage, scans `.agents/skills/*/tasks/<stage>.md` — filters by `when`
3. Builds task JSON with `stage` field per task + `files[]`
4. Calls `workflow create --tasks '<json>'` once
5. Executes stage by stage: load task file + matching rules → create files → validate → done

**Skills** define task and rule files. No direct instruction in workflow body needed.

## Skill Directory Structure

Addon skills (`designbook-css-*`, `designbook-drupal`, etc.) use a flat structure:

```
.agents/skills/[skill-name]/
├── SKILL.md              # Index only (required)
├── tasks/                # One file per creation task
│   └── [task-name].md    # e.g. create-component.md
├── rules/                # Constraints loaded conditionally
│   └── [rule-name].md    # frontmatter: when: { backend: drupal }
├── blueprints/           # Starting points for component creation
│   └── [name].md         # frontmatter: when: { steps: [create-component] }
├── resources/            # Reference documentation, split by concern
│   └── [topic].md
└── *.schema.json         # JSON Schemas for validation (if applicable)
```

The `designbook` skill uses a three-level concern-based structure with workflows inside:

```
.agents/skills/designbook/
├── SKILL.md
├── resources/            # Execution engine
├── <concern>/
│   ├── tasks/            # Concern-level shared tasks + workflow-specific (intake--<id>.md)
│   ├── rules/            # Concern-level rules
│   ├── resources/        # Concern-level reference docs
│   └── workflows/        # Workflow definition files (<workflow-id>.md)
```

### `tasks/` — Execution Units

**Filename = stage name.** `tasks/create-component.md` applies to stage `create-component`. No declaration needed — the AI discovers task files by scanning all skill directories for `tasks/<stage>.md`.

Task file frontmatter:

```markdown
---
when:
  frameworks.component: sdc   # optional — filter by config value
params:
  component: ~               # required param (~ = no default)
  slots: []                  # param with default
reads:
  - path: $DESIGNBOOK_HOME/data-model.yml
    workflow: debo-data-model
files:
  - $DESIGNBOOK_HOME/components/{{ component }}/{{ component }}.component.yml
---
```

- `when` — config conditions that must match; **never contains `stage:`** (stage = filename)
- `params` — AI fills from dialog; `~` means required
- `reads` — files required before this stage; missing → stop + tell user which workflow to run
- `files` — output paths; **must** use `$DESIGNBOOK_HOME/` or `$DESIGNBOOK_HOME/` prefix

Validation is **never** part of a task file — it runs automatically via `workflow validate --task`.

### `rules/` — Conditional Constraints

Rule files apply only when their `when` conditions match. Unlike task files, rules must explicitly declare `when.steps`:

```markdown
---
when:
  backend: drupal
  steps: [create-data-model]
---
```

| | Stage assignment | `when: steps:` required? |
|---|---|---|
| Task File | Filename (`create-vision.md` → stage `create-vision`) | No |
| Rule File | Must be declared explicitly | Yes (if stage-specific) |

- Without `when.steps`: rule applies to all steps
- Rules are loaded automatically — no explicit "read this file" needed in workflows

### `blueprints/` — Component Starting Points

Blueprint files provide starting points for component creation — required tokens, props, slots, and markup guidance. They use the same `when` frontmatter matching as rules:

```markdown
---
when:
  steps: [create-component]
---
# Blueprint: Section
## When to use
...
## Required Tokens
...
## Props
...
## Slots
...
## Markup Guidance
...
```

- Blueprints say "what to build"; rules say "how to build"
- Loaded via `skills/**/blueprints/*.md` glob, same matching as rules
- Layout tokens (spacing, container widths, grid gaps) are defined as component-level tokens in blueprints, not as global design tokens

## Canonical Stage Names

| Stage | Used for |
|-------|----------|
| `dialog` | Conversational interview (no task file) |
| `create-component` | Creating UI components (component.yml, twig, story.yml) |
| `create-shell-scene` | Creating the design system shell scene |
| `create-scene` | Creating section scene files |
| `create-data-model` | Creating data-model.yml |
| `create-tokens` | Creating design-tokens.yml |
| `create-css` | Generating CSS token files |
| `create-sample-data` | Creating section data.yml |
| `create-view-modes` | Creating view mode JSONata files |

## Naming Conventions

| Scope | Convention | Example |
|-------|-----------|---------|
| Component skills | `designbook-[concern]-[component-framework]` | `designbook-drupal/components/` |
| CSS skills | `designbook-css-[css-framework]` | `designbook-css-daisyui` |
| Backend rules | `designbook-[backend]` (unified root) | `designbook-drupal` |
| Addon skills | `designbook-addon-[concern]` | `designbook-addon-components` |
| Workflow files | `<concern>/workflows/<workflow-id>.md` within `designbook/` skill | `design/workflows/design-screen.md` |

**Concern-first, framework-last.** The framework/backend identifier always comes last.

## AI Rules

### Reads Check (Required Before Every Stage)

Before executing any task stage, check all `reads:` entries in the task file frontmatter:

- For each entry, verify the file exists at the declared `path`
- If **any** file is missing → **stop immediately** and tell the user:
  > ❌ `<filename>` not found. Run `/<workflow>` first.
- Do **not** proceed until all `reads:` files are present

## Resources

- [skill-authoring.md](resources/skill-authoring.md) — SKILL.md template, schema validation (ajv), JSONata transforms, @-references, config vars

## Checklist for New Skills

- [ ] `SKILL.md` with correct frontmatter (name, description) — index only
- [ ] Task files in `tasks/<stage-name>.md` with `when`, `params`, `reads`, `files` frontmatter
- [ ] Rule files in `rules/<name>.md` with `when.stages` if stage-specific
- [ ] Blueprint files in `blueprints/<name>.md` with `when.steps` (for component starting points)
- [ ] Schemas bundled in skill directory (not downloaded)
- [ ] Reference docs in `resources/` for format specs and examples
- [ ] Corresponding workflow at `designbook/<concern>/workflows/<workflow-id>.md` if user-facing
