---
name: debo
user-invocable: false
disable-model-invocation: true
description: Internal index of Designbook domain skills and shared resources.
metadata:
  internal: true
---

Internal reference index. Use the installed domain skills directly; each owns
its CLI intake, planning and execution.

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
| `design-component` | [skills/design-component/](skills/design-component/SKILL.md) | Create or change a Designbook component, including styling-only changes |
| `design-screen` | [skills/design-screen/](skills/design-screen/SKILL.md) | Create or change a named section screen |
| `design-entity` | [skills/design-entity/](skills/design-entity/SKILL.md) | Create or change one view/form mode + preview |
| `design-shell` | [skills/design-shell/](skills/design-shell/SKILL.md) | Create or change the application shell |
| `design-verify` | [skills/design-verify/](skills/design-verify/SKILL.md) | Visual testing against the design reference |
| `sync-verify` | [skills/sync-verify/](skills/sync-verify/SKILL.md) | Reconcile a backend render (config or scene) against Storybook |
| `import` | [skills/import/](skills/import/SKILL.md) | Import a full design system from a reference |
| `sync-to` | [skills/sync-to/](skills/sync-to/SKILL.md) | Generate the backend files for the data model and apply them |
| `seed-content` | [skills/seed-content/](skills/seed-content/SKILL.md) | Create the sample records as content in the live backend |
| `sb` | [skills/sb/](skills/sb/SKILL.md) | Manage the Storybook dev server (CLI passthrough) |

Shared content roots (no workflow, beside `skills/` at the parent): [design/](design/), [scenes/](scenes/).

## Resources

- [Workflow building](resources/workflow-building.md) — planning, modes (`ephemeral` \| `persist` \| `ask`), ReferenceNeed gate
- [Execution](resources/workflow-execution.md) — sole task loop; problems sidecar; ephemeral cleanup
- [CLI reference](resources/cli-reference.md)
