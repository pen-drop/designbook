---
name: skill-map
description: Full listing of all Designbook skills across Parts 1–3
---

# Skill Map

## Part 1 — Core Skill (`designbook`)

Main skill at `.agents/skills/designbook/` — a thin index (`SKILL.md`) over one **nested sub-skill per workflow** under `skills/<workflow>/`. Engine docs live in `resources/`; engine-wide types in `workflow/schemas.yml`.

**Sub-skills (one per workflow):**
`design-component`, `design-screen`, `design-entity`, `design-shell`, `design-verify`, `sync-verify`, `vision`, `tokens`, `data-model`, `sections`, `shape-section`, `sample-data`, `css-generate`, `install`, `import`, `sync-to`, `sb` — each at `skills/<workflow>/` with its own `SKILL.md`, `workflows/<id>.md`, and `tasks/`/`rules/`/`blueprints/`/`schemas.yml`.

**Shared content roots (workflow-less):**

| Root | Shared by | Contents |
|------|-----------|----------|
| `design/` | the six design-family workflows | `tasks/`, `rules/`, `blueprints/`, `resources/`, `schemas.yml` |
| `scenes/` | design + sections workflows | `tasks/`, `schemas.yml` |

## Part 2 — Storybook Addon (`storybook-addon-designbook`)

TypeScript package at `packages/storybook-addon-designbook/`. Powers the CLI and Storybook UI panels.

**Supporting skill:** `designbook-addon-skills` — use for changes to the addon TypeScript code.

## Part 3 — Integration Skills

Each skill extends Part 1 with backend/framework-specific tasks, rules, and blueprints.

| Skill | Purpose |
|-------|---------|
| `designbook-css-tailwind` | Tailwind CSS token generation and class conventions |
| `designbook-drupal` | Drupal SDC component structure, data model, view modes |
| `designbook-stitch` | Stitch design system integration |

## Meta Skills

| Skill | Purpose |
|-------|---------|
| `designbook-skill-creator` | (this skill) Skill authoring architecture, principles, structure |
| `designbook-addon-skills` | Storybook addon TypeScript development |
