---
name: debo
argument-hint: "[install|vision|tokens|data-model|design-component|design-screen|design-entity|design-shell|design-verify|sync-verify|sections|shape-section|sample-data|css-generate|import|sync-to|sb] [--optimize]"
description: >
  Designbook design system — thin index over per-workflow sub-skills. Use ALWAYS
  when creating, modifying, or deleting components, screens, scenes, design
  tokens, CSS, or any design system artifact. Each workflow is its own sub-skill
  under `skills/<workflow>/`; this index points to them and documents the global
  flags. Never create component files without a designbook skill. Each intake's
  first command is `intake <workflow>`. `_debo` /
  `npx storybook-addon-designbook` is the only command surface — run it, read
  stdout. Skill descriptions fire the skill; they are not the command spec. A
  nonzero CLI exit ends the work with that exact message.
---

Choose the matching domain sub-skill below. Every intake starts with
`intake <workflow>`. Then the sub-skill resolves its complete scope from that
context and follows the [shared builder](resources/workflow-building.md): seal a
plan, then either run [execute-workflow](skills/execute-workflow/SKILL.md), stop
after a durable `plan_path` handoff (**persist**), or ask which — persistence and
execute start are separate mode decisions (defaults per workflow; caller override
wins). Ephemeral and durable builds use the same sealed-plan contract. Run `_debo`
/ `npx storybook-addon-designbook` from the [CLI reference](resources/cli-reference.md).

`--optimize` asks for optimization suggestions after completion; apply only separately requested changes.

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
| `extract-reference` | [skills/extract-reference/](skills/extract-reference/SKILL.md) | Capture selected source or actual observations into an immutable revision |
| `design-component` | [skills/design-component/](skills/design-component/SKILL.md) | Create or change a UI component (explicit invocation only) |
| `design-screen` | [skills/design-screen/](skills/design-screen/SKILL.md) | Create or change a named section screen |
| `design-entity` | [skills/design-entity/](skills/design-entity/SKILL.md) | Create or change one view/form mode + preview |
| `design-shell` | [skills/design-shell/](skills/design-shell/SKILL.md) | Create or change the application shell |
| `design-verify` | [skills/design-verify/](skills/design-verify/SKILL.md) | Visual testing against the design reference |
| `sync-verify` | [skills/sync-verify/](skills/sync-verify/SKILL.md) | Reconcile a backend render (config or scene) against Storybook |
| `import` | [skills/import/](skills/import/SKILL.md) | Import a full design system from a reference |
| `sync-to` | [skills/sync-to/](skills/sync-to/SKILL.md) | Export the data model as Drupal config YAML |
| `sb` | [skills/sb/](skills/sb/SKILL.md) | Manage the Storybook dev server (CLI passthrough) |

Shared content roots (no workflow, beside `skills/` at the parent): [design/](design/), [scenes/](scenes/).

## Resources

- [Write planning](design/resources/write-planning.md) — creation/change intake invariants
- [Workflow building](resources/workflow-building.md) — planning, modes (`ephemeral` \| `persist` \| `ask`), ReferenceNeed gate
- [Execution](resources/workflow-execution.md) — sole task loop; blockade; ephemeral cleanup
- [CLI reference](resources/cli-reference.md)
