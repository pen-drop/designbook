---
when:
  steps: [create-component]
---

# Typography Token Usage

Components SHALL use typography scale tokens for font sizing instead of arbitrary Tailwind utility classes.

## Required

- Use `var(--text-<role>)` or the corresponding Tailwind `text-<role>` utility for font sizes
- Use `var(--text-<role>--weight)` for font weights where a matching typography scale role exists
- Use `var(--text-<role>--line-height)` for line heights where a matching typography scale role exists

## Allowed Exception

When a component needs a font size that does not correspond to any typography scale role, arbitrary Tailwind utilities (e.g., `text-sm`, `text-lg`) are allowed with a comment explaining why no token fits.
