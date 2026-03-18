---
name: designbook-skills
description: Meta-skill for creating and maintaining Designbook skills. Defines conventions for skill structure, tasks, rules, schema validation, and workflow integration.
---

# Designbook Skills

This meta-skill documents the conventions for creating Designbook skills. Use it when building new skills or updating existing ones.

## Architecture

```
Workflow (debo-*)          →  Skill (designbook-*)
  ↳ Interview only             ↳ tasks/<stage>.md  — what to create
  ↳ Gather user input          ↳ rules/<name>.md   — constraints (conditional)
  ↳ stages: [dialog, ...]
```

**Workflows** are thin — they gather input conversationally, then let the AI discover task files:
```yaml
workflow:
  title: Design Shell
  stages: [dialog, create-component, create-scene]
```

After dialog, the AI:
1. Reads `stages` from frontmatter
2. For each non-dialog stage, scans `.agents/skills/*/tasks/<stage>.md` — filters by `when`
3. Builds task JSON with `stage` field per task + `files[]`
4. Calls `workflow create --tasks '<json>'` once
5. Executes stage by stage: load task file + matching rules → create files → validate → done

**Skills** define task and rule files. No direct instruction in workflow body needed.

## Skill Directory Structure

```
.agents/skills/[skill-name]/
├── SKILL.md              # Index only (required)
├── tasks/                # One file per creation task
│   └── [task-name].md    # e.g. create-component.md
├── rules/                # Constraints loaded conditionally
│   └── [rule-name].md    # frontmatter: when: { backend: drupal }
├── resources/            # Reference documentation, split by concern
│   └── [topic].md
└── *.schema.json         # JSON Schemas for validation (if applicable)
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
  - path: $DESIGNBOOK_DIST/data-model.yml
    workflow: debo-data-model
files:
  - $DESIGNBOOK_DIST/components/{{ component }}/{{ component }}.component.yml
---
```

- `when` — config conditions that must match; **never contains `stage:`** (stage = filename)
- `params` — AI fills from dialog; `~` means required
- `reads` — files required before this stage; missing → stop + tell user which workflow to run
- `files` — output paths; **must** use `$DESIGNBOOK_DIST/` or `$DESIGNBOOK_DRUPAL_THEME/` prefix

Validation is **never** part of a task file — it runs automatically via `workflow validate --task`.

### `rules/` — Conditional Constraints

Rule files apply only when their `when` conditions match. Unlike task files, rules must explicitly declare `when.stages`:

```markdown
---
when:
  backend: drupal
  stages: [create-data-model]
---
```

| | Stage assignment | `when: stages:` required? |
|---|---|---|
| Task File | Filename (`create-vision.md` → stage `create-vision`) | No |
| Rule File | Must be declared explicitly | Yes (if stage-specific) |

- Without `when.stages`: rule applies to all stages
- Rules are loaded automatically — no explicit "read this file" needed in workflows

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
| Component skills | `designbook-[concern]-[component-framework]` | `designbook-components-sdc` |
| CSS skills | `designbook-css-[css-framework]` | `designbook-css-daisyui` |
| Backend rules | `designbook-[concern]-[backend]` | `designbook-data-model-drupal` |
| Addon skills | `designbook-addon-[concern]` | `designbook-addon-components` |
| Workflow files | `debo-[action]` | `debo-design-component` |

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
- [ ] Schemas bundled in skill directory (not downloaded)
- [ ] Reference docs in `resources/` for format specs and examples
- [ ] Corresponding workflow in `.agents/workflows/` if user-facing
