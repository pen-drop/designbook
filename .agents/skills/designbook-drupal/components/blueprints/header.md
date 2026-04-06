---
type: component
name: header
priority: 10
when:
  steps: [design-shell:intake]
---

# Blueprint: Header

Site header that composes logo, navigation, and optional actions.

**Use for:** The primary site header region.

## Structure

- Wraps its content in a `container` component for consistent edge spacing and max-width
- Contains a `navigation` component as a required slot

## Props
- sticky: boolean (default: false)

## Slots
- logo — site logo / brand mark (required)
- navigation — navigation component (required)
- actions — action buttons (search, CTA, etc.)
