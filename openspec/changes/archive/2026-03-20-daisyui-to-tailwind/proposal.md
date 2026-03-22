# Proposal: Replace DaisyUI with Plain Tailwind CSS

## Problem

The test integration currently depends on DaisyUI v5. DaisyUI component classes (`btn`, `navbar`, `dropdown`, `menu`, `link`, `rounded-box`) create a hard dependency on the DaisyUI plugin, making the integration less portable and harder to reason about. The `designbook.config.yml` framework setting should reflect plain Tailwind.

## Solution

Remove DaisyUI and replace all DaisyUI component classes with explicit Tailwind CSS utilities. Color semantic tokens (`bg-primary`, `text-base-content`, etc.) are preserved as-is — they continue to work via `--color-*` CSS variables in `@theme`.

## Scope

- `package.json` — remove `daisyui` dependency
- `designbook.config.yml` — change `DESIGNBOOK_FRAMEWORK_CSS` to `tailwind`
- CSS pipeline — replace `@plugin "daisyui/theme"` with `@theme {}`, remove DaisyUI imports
- Twig templates — replace DaisyUI component classes with plain Tailwind equivalents
