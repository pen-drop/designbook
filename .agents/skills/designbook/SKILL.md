---
name: debo
argument-hint: "[install|vision|tokens|data-model|design-component|design-screen|design-entity|design-shell|design-verify|config-verify|sections|shape-section|sample-data|css-generate|import|sync-to|sb] [--optimize|--plan|--from-plan <name>]"
description: >
  Designbook design system — thin index over per-workflow sub-skills. Use ALWAYS
  when creating, modifying, or deleting components, screens, scenes, design
  tokens, CSS, or any design system artifact. Each workflow is its own sub-skill
  under `skills/<workflow>/`; this index points to them and documents the global
  flags. Never create component files without a designbook skill.
---

## Rules

> ⛔ **Every workflow runs through `resources/workflow-execution.md`.** Each sub-skill loads it on entry — it contains the binding execution rules (Rules 0–7) for all `debo` workflows. No stage may start before these rules are loaded.

> ⛔ **Spec/change files are forbidden inputs.** Never read change files, delta specs, or main specs inside a `debo` workflow. Task context comes only from `.agents/skills/**/tasks/`, `.agents/skills/**/rules/`, and `.agents/skills/**/blueprints/`.

## Architecture

Each of the 17 workflows is its own **nested sub-skill** under `skills/<workflow>/`, holding that workflow's `SKILL.md`, `workflows/<id>.md`, and its `tasks/`/`rules/`/`blueprints/`/`schemas.yml`. `skills/` contains **only** these 17 sub-skills (each with a `SKILL.md`).

Content shared across workflows — which belongs to no single workflow — lives in two workflow-less **shared content roots** beside `skills/` at the parent (not under `skills/`, so `skills/` stays a clean list of real sub-skills):

- `design/` — tasks/rules/blueprints/schema shared by the six design-family workflows.
- `scenes/` — scene tasks + schema shared by design and sections workflows.

Both are still discovered by the engine's `skills/**` globs (they sit under `.agents/skills/designbook/`). Engine docs (`resources/`) and the engine-wide `workflow/schemas.yml` also stay at the parent.

Each sub-skill is independently addressable (its `name` = the workflow ID) and declares its own auto-dispatch triggers in its `description`. To run a workflow, load its sub-skill (e.g. `skills/tokens/SKILL.md`) and follow it — it loads the engine and starts `_debo workflow create --workflow <id>` itself.

## Global Flags

Parsed from `$ARGUMENTS` by each sub-skill before it dispatches. Flags are not sub-commands and do not affect workflow selection; multiple may be combined.

| Flag | Visibility | Effect |
|---|---|---|
| `--optimize` | User-facing | After the workflow completes, review all created/modified artifacts and suggest concrete optimizations (performance, maintainability, accessibility, design-system consistency). Output as a numbered list. Do not apply changes — only suggest. |
| `--plan` | User-facing | Run the workflow up to and including the last `interactive: true` stage (deterministic stages in that prefix run too, so interactive stages have their context), then write `$DESIGNBOOK_DATA/plans/<workflow>/<slug>.plan.md` (slug auto-generated from the primary target the interactive stage(s) established) and stop. Stages after the last interactive stage do not run. |
| `--from-plan <name\|hint>` | User-facing | Autonomous run: resolve `<name\|hint>` to a plan file (exact path → exact name in `plans/<workflow>/` → substring match; see `workflow-execution.md` § 10 step 0), then read decisions from that file instead of asking the user; deterministic stages run to completion. |

`--from-plan` takes a `<file>` argument: the value immediately following `--from-plan` in `$ARGUMENTS` is the plan file path (unlike bare flags `--plan` and `--optimize`, which carry no argument).

## Sub-Skill Index

| Workflow | Sub-skill | Purpose |
|---|---|---|
| `install` | [skills/install/](skills/install/SKILL.md) | Install designbook — detect backend, write config, set up Storybook |
| `vision` | [skills/vision/](skills/vision/SKILL.md) | Define the product vision |
| `tokens` | [skills/tokens/](skills/tokens/SKILL.md) | Choose colors and typography (design tokens) |
| `data-model` | [skills/data-model/](skills/data-model/SKILL.md) | Define the data model |
| `sections` | [skills/sections/](skills/sections/SKILL.md) | Define sections from the vision |
| `shape-section` | [skills/shape-section/](skills/shape-section/SKILL.md) | Specify one section — flows, UI requirements, scope |
| `sample-data` | [skills/sample-data/](skills/sample-data/SKILL.md) | Generate per-bundle sample data |
| `css-generate` | [skills/css-generate/](skills/css-generate/SKILL.md) | Generate CSS token files from design tokens |
| `design-component` | [skills/design-component/](skills/design-component/SKILL.md) | Create a UI component (explicit invocation only) |
| `design-screen` | [skills/design-screen/](skills/design-screen/SKILL.md) | Create screen components for a section |
| `design-entity` | [skills/design-entity/](skills/design-entity/SKILL.md) | Build one entity view-mode + preview |
| `design-shell` | [skills/design-shell/](skills/design-shell/SKILL.md) | Design the application shell |
| `design-verify` | [skills/design-verify/](skills/design-verify/SKILL.md) | Visual testing against the design reference |
| `config-verify` | [skills/config-verify/](skills/config-verify/SKILL.md) | Reconcile a backend render against Storybook |
| `import` | [skills/import/](skills/import/SKILL.md) | Import a full design system from a reference |
| `sync-to` | [skills/sync-to/](skills/sync-to/SKILL.md) | Export the data model as Drupal config YAML |
| `sb` | [skills/sb/](skills/sb/SKILL.md) | Manage the Storybook dev server (CLI passthrough) |

Shared content roots (no workflow, beside `skills/` at the parent): [design/](design/), [scenes/](scenes/).

## Resources

- [workflow-execution.md](resources/workflow-execution.md) — Execution guide
- [cli-reference.md](resources/cli-reference.md) — CLI command index
