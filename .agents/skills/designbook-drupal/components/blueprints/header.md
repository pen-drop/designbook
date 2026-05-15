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

## Layout dimensions

The header is two stacked rows. Use these values as the starting point; override only when
the design reference (extract.json landmarks) shows a measurably different value.

| Row | Height | Padding |
|-----|--------|---------|
| Brand strip (logo + optional tagline) | 60px | 8px 0 |
| Navigation bar | 60px | 8px 0 |

Total header height: **≥ 136px** (rows + padding). Do **not** collapse both rows into a
single flex row — keep them as separate `<div>` or `<section>` elements stacked vertically.
