---
type: component
name: header
priority: 10
trigger:
  domain: components.shell
---

# Blueprint: Header

Site header that composes logo, navigation, and optional actions.

**Use for:** The primary site header region.

## Structure

- Wraps its content in a [`container`](container.md) component for consistent edge spacing and max-width
- Contains a [`navigation`](navigation.md) component (variant: main) as a required slot

## Props
- sticky: boolean (default: false)

## Slots
- logo — site logo / brand mark (recommended)
- navigation — navigation component (recommended — see `navigation.md` rule for enforcement)
- Additional slots as determined by the design reference

## Layout

Headers vary per design: a single bar, stacked rows (brand strip + navigation), or more.
Derive the row/region count, heights, padding, and stacking from the design reference
(extract.json landmarks) — do not assume a fixed shape. Preserve every visually distinct
landmark region as its own stacked element rather than collapsing them into one row.
