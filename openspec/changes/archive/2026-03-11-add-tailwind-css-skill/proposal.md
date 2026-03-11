## Why

The `designbook-css-daisyui` skill currently mixes Tailwind CSS concerns (spacing scale, container widths, grid system) with DaisyUI-specific concerns (theme plugin, component classes, color-scheme). Layout tokens like `container-md`, `gap-md`, `pb-auto` are hardcoded in the layout component reference without a formal token-to-CSS pipeline. Adding a `designbook-css-tailwind` skill creates a clean separation: Tailwind handles structural tokens (container, spacing, section-spacing), DaisyUI extends it with theme/component semantics.

## What Changes

- **New skill** `designbook-css-tailwind` — Token Naming Conventions for container, spacing, and section-spacing. CSS generation via `@theme inline` format.
- **Move spacing** from `designbook-css-daisyui` → `designbook-css-tailwind` (spacing token naming conventions)
- **Update `designbook-css-daisyui`** — Add prerequisite on `designbook-css-tailwind`, remove spacing conventions that moved
- **Update `debo-design-tokens` workflow** — Add steps for container max-widths and section-spacing
- **Update layout-reference.md** — Reference tokens instead of hardcoded values for `container-*` and `pb-auto`/`pt-auto`

## Capabilities

### New Capabilities
- `tailwind-css-tokens`: Token naming conventions, CSS generation rules, and structural layout tokens (container, spacing, section-spacing) for the Tailwind CSS framework layer

### Modified Capabilities
_none — no existing spec-level requirements change_

## Impact

- **Skills**: New `designbook-css-tailwind`, modified `designbook-css-daisyui` (prerequisite + spacing removal)
- **Workflows**: `debo-design-tokens` (new steps for container + section-spacing)
- **Resources**: `layout-reference.md` in `designbook-components-sdc` (token references)
- **No code changes** — skills/workflows only
