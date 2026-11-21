---
name: designbook
description: >
  Designbook design-system workflows (vision, tokens, data model, sections, components, screens, shell, CSS, sync to a backend). Use when the user asks for any Designbook workflow or mentions designbook.config.yml.
---

Designbook's skills ship inside the `storybook-addon-designbook` npm package; the CLI loads them from there.

1. If `storybook-addon-designbook` is not in the project's `package.json`, install it as a dev dependency (`npm i -D storybook-addon-designbook`).
2. First command: `npx storybook-addon-designbook intake <workflow>`. Follow the resolved intake context in its output.

| Workflow | Purpose |
|---|---|
| `install` | Install designbook — detect backend, write config, set up Storybook |
| `vision` | Define the product vision |
| `tokens` | Choose colors and typography (design tokens) |
| `data-model` | Define the data model |
| `sections` | Define sections from the vision |
| `shape-section` | Specify one section — flows, UI requirements, scope |
| `sample-data` | Generate per-bundle sample data |
| `css-generate` | Generate CSS token files from design tokens |
| `extract-reference` | Capture selected source or actual observations into an immutable revision |
| `design-component` | Create or change a Designbook component, including styling-only changes |
| `design-screen` | Create or change a named section screen |
| `design-entity` | Create or change one view/form mode + preview |
| `design-shell` | Create or change the application shell |
| `design-verify` | Visual testing against the design reference |
| `sync-verify` | Reconcile a backend render (config or scene) against Storybook |
| `import` | Import a full design system from a reference |
| `sync-to` | Generate the backend files for the data model and apply them |
| `seed-content` | Create the sample records as content in the live backend |
| `sb` | Manage the Storybook dev server (CLI passthrough) |
