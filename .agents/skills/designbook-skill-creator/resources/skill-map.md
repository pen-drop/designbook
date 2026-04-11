---
name: skill-map
description: Full listing of all Designbook skills across Parts 1–3
---

# Skill Map

## Part 1 — Core Skill (`designbook`)

Main skill at `.agents/skills/designbook/`. Contains all user-facing workflows.

| Concern | Workflows |
|---------|-----------|
| `design` | `design-component`, `design-screen`, `design-shell`, `design-verify` |
| `data-model` | `data-model` |
| `tokens` | `tokens` |
| `css-generate` | `css-generate` |
| `sections` | `sections`, `shape-section` |
| `sample-data` | `sample-data` |
| `vision` | `vision` |

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
| `designbook-devtools` | Dev tooling and local development helpers |

## Meta Skills

| Skill | Purpose |
|-------|---------|
| `designbook-skill-creator` | (this skill) Skill authoring architecture, principles, structure |
| `designbook-addon-skills` | Storybook addon TypeScript development |
