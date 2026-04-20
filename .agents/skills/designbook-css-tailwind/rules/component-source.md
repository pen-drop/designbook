---
trigger:
  domain: components
filter:
  frameworks.style: tailwind
---

# Tailwind Component Source Registration

Tailwind's JIT compiler must see every file that uses utility classes. The current blueprint uses a single **wildcard** `@source` in `$DESIGNBOOK_CSS_APP` that covers all components at once:

```css
/* In $DESIGNBOOK_CSS_APP (e.g. app.src.css) */
@source "../components/**/*.{twig,js,yml}";
```

## When this rule is satisfied automatically

- The wildcard directive above is already present in `$DESIGNBOOK_CSS_APP`.
- The new component was created inside `components/<name>/` with `.twig`, `.js`, or `.yml` extensions.

In that case **no edit is required** — the new component is picked up on the next build.

## When an explicit `@source` is required

Only add a per-component directive if the wildcard does not apply, e.g.:

- The component lives outside `components/**` (custom path).
- The component uses a non-standard extension not matched by the wildcard.
- A narrower scan is intentionally configured (no wildcard in `$DESIGNBOOK_CSS_APP`).

```css
/* Only if wildcard does not cover the component */
@source "../custom-path/new-component";
```

## Verification

After creating the component, confirm one of the following holds before ending the stage:

1. `$DESIGNBOOK_CSS_APP` contains a wildcard `@source` that matches the new component's directory, **or**
2. `$DESIGNBOOK_CSS_APP` contains an explicit `@source` entry for the new component's directory.

Without a matching directive, Tailwind utility classes used in the component's template will not be compiled into the output CSS.
