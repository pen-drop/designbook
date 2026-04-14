---
name: designbook-skill-creator
user-invocable: true
description: Meta-skill documenting the 4-level skill model, design principles, and skill map for all Designbook skills. Load before modifying any .agents/skills/ file.
---

# Designbook Skill Creator

Authoritative reference for authoring and maintaining Designbook skills. Load this skill before modifying any file under `.agents/skills/`.

## Three-Part Project Architecture

```
Part 1 — Core skill
  .agents/skills/designbook/
    <concern>/workflows/<workflow-id>.md   # workflow definitions
    <concern>/tasks/                       # concern-level tasks
    <concern>/rules/                       # concern-level rules
    resources/                             # execution engine docs

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

## 4-Level Skill Model

```
workflow
  └── stage
        ├── task        (WHAT to produce)
        ├── blueprint   (overridable starting point)
        └── rule        (hard constraint)
```

| Level | File location | Purpose |
|-------|--------------|---------|
| **Workflow** | `designbook/<concern>/workflows/<id>.md` | Declares stages and steps |
| **Stage** | (filename of task file) | Groups tasks; name = filename |
| **Task** | `tasks/<stage-name>.md` | Declares outputs; WHAT not HOW |
| **Blueprint** | `blueprints/<name>.md` | Overridable starting point |
| **Rule** | `rules/<name>.md` | Hard constraint; cannot be overridden |

## Key Principles

See [`rules/principles.md`](rules/principles.md) for detailed principles with examples.

- **Tasks say WHAT, never HOW** — task files declare result schemas and params; never contain style or implementation instructions
- **Results declare schema** — file results with `path:`, data results with JSON Schema; `$ref` to `schemas.yml`
- **Blueprints are overridable** — provide a starting point; integrations may deviate
- **Rules are absolute** — apply unconditionally once their `when` conditions match; integrations cannot override

## File Structure Conventions

See [`rules/structure.md`](rules/structure.md) for full conventions.

## Schema Reference

See [`resources/schemas.md`](resources/schemas.md) for `schemas.yml` format, `$ref` syntax, and result conventions.

See [`resources/schema-composition.md`](resources/schema-composition.md) for the schema merge model (extends/provides/constrains).

## Skill Map

See [`resources/skill-map.md`](resources/skill-map.md) for a full listing of all skills.

## Research Flag

See [`resources/research.md`](resources/research.md) for the `--research` post-workflow review (Superpowers-based).
