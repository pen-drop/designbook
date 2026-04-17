# Development Rules

## Code Quality

Run `pnpm check` before committing. It runs typecheck → lint → test (fail-fast).

```bash
pnpm check
```

This runs sequentially (fail-fast):

1. **typecheck** — `tsc --noEmit` (static type analysis)
2. **lint** — `eslint` (code quality + Prettier formatting)
3. **test** — `vitest` (unit tests)

To auto-fix formatting and lint issues:

```bash
pnpm --filter storybook-addon-designbook lint:fix
```

## Skills

Skill source files live in `.agents/skills/` — that is the canonical location. `.claude/skills/` is a symlink to it and must not be edited separately.

Before creating OR editing any task/rule/blueprint/workflow/schemas.yml under `.agents/skills/designbook/`, `.agents/skills/designbook-*/` (drupal, css-tailwind, stitch, devtools), or the skill-creator's own `rules/` and `resources/`, you MUST load `designbook-skill-creator` first. This is not optional — writing these files without the skill loaded regularly produces invalid output (HOW mixed into WHAT, rules with own params, inline-duplicated schemas).

## Skill Architecture

The project has three parts:

- **Part 1 — Core skill** (`designbook`): Workflows, stages, and component creation
- **Part 2 — Storybook addon** (`storybook-addon-designbook`): TypeScript package; use `designbook-addon-skills` for changes
- **Part 3 — Integration skills** (`designbook-css-tailwind`, `designbook-drupal`, `designbook-stitch`, `designbook-devtools`): Extend Part 1 with framework/backend-specific tasks, rules, and blueprints

4-level skill model: **workflow → stage → task/blueprint/rule**
- Tasks say WHAT to produce, never HOW
- Blueprints are overridable starting points (directory structure, naming, markup guidance)
- Rules are hard constraints that cannot be overridden by integrations

## Test Workspace

A test workspace is a standalone directory for testing integrations (Drupal, Tailwind, etc.) against a real Storybook instance. It is **not** a git worktree — it is needed in every environment (repo root or worktree) where you want to test an integration.

```bash
./scripts/setup-workspace.sh <name>
```

- Run from repo root or any git worktree root.
- Always rebuilt from scratch — re-run to pick up changes.
- In a git worktree, the script copies that worktree's `.agents`/`.claude`, so skill changes under development are reflected in the test workspace.
