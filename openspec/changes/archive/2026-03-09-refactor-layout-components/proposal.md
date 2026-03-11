# Refactor Layout Components

## Why

The current `layout` component reference is overloaded — it handles max-width, grid, background, spacing, and theming all in one. This makes it hard to use in non-section contexts and creates complex Twig logic.

## What Changes

Update `layout-reference.md` in the `designbook-components-sdc` skill to define three composable components instead of two:

- **`container`** — Universal wrapper: max-width, padding-inline (px for browser edge), background slot, padding_top/padding_bottom (as props), theme
- **`grid`** — Responsive grid presets (1-4 columns with breakpoints), gap. Standalone or inside container.
- **`section`** — Layout Builder adapter: delegates to container + grid, exposes 8 fixed column slots

### Affected

- **Replace:** `layout` and `layout_columns` definitions in `layout-reference.md`
- **Update:** `SKILL.md` component names and build-order rule (already done)
- **Update:** Existing `.scenes.yml` and `.jsonata` files referencing old component names

## Scope

This change updates the **skill reference documentation only**. Actual component files are generated per-project by the `debo-design-screen` workflow.
