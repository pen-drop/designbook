---
name: designbook:design:region-properties
trigger:
  steps: [create-component, create-scene]
---

# Region Properties

When `region_properties.matched_via !== "none"`, `nodes[]` describes the
rendered subtree. **Translate** captured `style` values — never copy them
verbatim.

## Hard constraints (integration-independent)

- **No inline style attributes.** Every visual property lives in a class
  or token-referenced rule, not on the element. Integration-specific rules
  decide the class mechanism.
- **Design tokens first.** Map captured colors, spacing, typography to
  existing entries in `design-tokens.yml`. If a value isn't covered, extend
  the token file before generating output. No hardcoded hex / px in CSS.
- **Drop computed-style noise** — these are browser defaults, not design intent:
  - `background ∈ { '', transparent, rgba(0,0,0,0) }`
  - `foreground === '#000000'` on body-level nodes
  - `font_family` starting with `system-ui` / `-apple-system` / `BlinkMacSystemFont`
  - `padding`, `margin` equal to `'0'`
  - `border` with width 0
- **Don't carry vendor BEM classes** from the matched root (e.g. an
  Angular custom-element tag). Derive a clean component-scoped class.

## What to use

- Structural hierarchy from `nodes[]` parent_id / child_ids.
- Non-noise color, layout, spacing values, mapped to tokens.
- `bbox` as a sanity check on dimensions — translated through tokens
  where possible.

## Fallback

When `region_properties` is missing or `matched_via === "none"`, derive
from `reference` (extract.json) + `design_hint` only.
