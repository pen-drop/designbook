---
name: designbook-css-tailwind
disable-model-invocation: true
user-invocable: false
description: Tailwind CSS v4 framework rules — structural token naming conventions (layout-width, layout-spacing, grid) and CSS token generation via @theme. Use when DESIGNBOOK_FRAMEWORK_CSS includes tailwind (directly or via daisyui).
---

# Designbook CSS Tailwind

Tailwind v4 CSS generation rules. Generates `@theme` blocks from W3C Design Tokens.

> **This skill is loaded by `css-generate`** for CSS generation. Token naming conventions for the `debo-design-tokens` dialog are loaded automatically via `rules/tailwind-naming.md`.

Non-standard namespaces (e.g. `--layout-spacing-*`, `--grid-*`) require `var()`:

```html
<div class="py-[var(--layout-spacing-md)]">...</div>
```

## Task Files

- [create-tokens.md](tasks/create-tokens.md) — Generate `design-tokens.yml` (fallback, loaded by `debo-design-tokens`)

## Rules

- [component-styling.md](rules/component-styling.md) — Tailwind utility-first component styling policy.
- [component-source.md](rules/component-source.md) — Tailwind source registration for component templates.
- [css-mapping.md](rules/css-mapping.md) — Token-group-to-CSS mapping for the generic `generate-jsonata` task.

## Install

CSS-framework install rules, loaded by the core install workflow
(`designbook/install/workflows/install.md`) when their `trigger.steps` match.

- [install/rules/detect-tailwind.md](install/rules/detect-tailwind.md) — `write-config`: pre-selects Tailwind as the css_framework default
- [install/rules/tailwind-storybook.md](install/rules/tailwind-storybook.md) — `setup-storybook` (filter `frameworks.css: tailwind`): deps, Vite wiring, app.src.css, config update
