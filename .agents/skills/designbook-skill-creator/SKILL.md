---
name: designbook-skill-creator
user-invocable: true
description: Authoritative spec for authoring tasks, rules, blueprints, workflows, and schemas.yml under .agents/skills/designbook/, .agents/skills/designbook-*/, and this skill's own rules/ and resources/. Load the matching per-file-type rule before creating or editing ANY such file — rules/task-files.md for tasks, rules/blueprint-files.md for blueprints, rules/rule-files.md for rules, rules/schema-files.md for schemas.yml, rules/workflow-files.md for workflow definitions, plus rules/common-rules.md always. Skipping this produces files that violate the single source of truth for authoring + validation.
metadata:
  internal: true
---

# Designbook Skill Creator

Authoritative reference for authoring and maintaining Designbook skills. Load this skill before modifying any file under `.agents/skills/`.

## Required Writing Skill

Before creating, editing, or reviewing agent-facing skill instructions, load and
apply `writing-for-agents` (installed as `matt-skills-curated:writing-for-agents`)
from the available skill catalog. This is a mandatory prerequisite: its writing
principles govern the prose; the file-type rules below govern Designbook structure.
If the skill cannot be found, report the missing dependency before authoring.

Load [rules/writing-files.md](rules/writing-files.md) alongside it for the
Designbook-specific writing checks (`WRITE-01` .. `WRITE-04`). Before completing
the work, review every changed instruction against both and resolve findings or
report those that remain; for a review-only request, report findings without edits.

## Three-Part Project Architecture

```
Part 1 — Core skill (one nested sub-skill per workflow)
  .agents/skills/designbook/
    SKILL.md                               # thin index + global flags
    skills/<workflow>/SKILL.md             # domain intake index
    skills/<workflow>/workflows/<id>.md    # workflow definition
    skills/<workflow>/{tasks,rules,blueprints}/  # this workflow's content + schemas.yml
    design/  scenes/                       # shared, workflow-less content roots (beside skills/)
    resources/                             # execution engine docs
    workflow/schemas.yml                   # engine-wide types

Part 2 — Storybook addon
  packages/storybook-addon-designbook/     # TypeScript package (CLI, UI)
  → use designbook-addon-skills for changes

Part 3 — Integration skills
  .agents/skills/designbook-css-tailwind/  # CSS framework integration
  .agents/skills/designbook-drupal/        # Drupal backend integration
  .agents/skills/designbook-stitch/        # Stitch design system integration
  .agents/skills/designbook-devtools/      # Dev tooling integration
  → each extends Part 1 with its own tasks/, rules/, blueprints/
```

## Intake and execution

Domain intake → agent-authored complete document → execute-workflow. Follow the [builder](../designbook/resources/workflow-building.md).

## Template content model

```
workflow
  └── stage
        ├── task        (WHAT to produce)
        ├── blueprint   (overridable starting point)
        └── rule        (hard constraint)
```

| Level | File location | Purpose |
|-------|--------------|---------|
| **Workflow** | `designbook/skills/<workflow>/workflows/<id>.md` | Planning template of executable building blocks |
| **Stage** | (filename of task file) | Groups tasks; name = filename |
| **Task** | `tasks/<stage-name>.md` | Declares outputs; WHAT not HOW |
| **Blueprint** | `blueprints/<name>.md` | Overridable starting point |
| **Rule** | `rules/<name>.md` | Hard constraint; cannot be overridden |

## Rule Files by Artifact Type

Load the matching rule file **before** creating or editing any file of that type.
`common-rules.md` loads on top in every case.

| Creating/editing | Load |
|---|---|
| `tasks/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/task-files.md](rules/task-files.md) |
| `blueprints/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/blueprint-files.md](rules/blueprint-files.md) |
| `rules/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/rule-files.md](rules/rule-files.md) |
| `schemas.yml` | [rules/common-rules.md](rules/common-rules.md) + [rules/schema-files.md](rules/schema-files.md) |
| `workflows/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/workflow-files.md](rules/workflow-files.md) |

Each rule file contains narrative + correct/wrong examples (authoring guidance) and a
`## Checks` table (validation source of truth). The same files are loaded by the
validator runner — see [resources/validate.md](resources/validate.md).

## Schema Reference

See [`resources/schemas.md`](resources/schemas.md) for `schemas.yml` format, `$ref` syntax, and result conventions.

See [`resources/schema-composition.md`](resources/schema-composition.md) for the schema merge model (extends/provides/constrains).

## Skill Map

See [`resources/skill-map.md`](resources/skill-map.md) for a full listing of all skills.

## Research Mode

See `.agents/skills/designbook-test/skills/research/resources/research.md` for the autonomous research-mode loop protocol. The audit criteria are in `.agents/skills/designbook-test/resources/audit-criteria.md`.

## Skill Validation

See [`resources/validate.md`](resources/validate.md) for static analysis of skill files (principles compliance, metrics, scoring).
