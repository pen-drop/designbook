---
type: component
name: footer
priority: 10
when:
  steps: [design-shell:intake]
---

# Blueprint: Footer

Site footer that composes brand area, navigation, and copyright.

**Use for:** The page footer region.

## Structure

- Wraps its content in a `container` component for consistent edge spacing and max-width
- Contains a `navigation` component (variant: footer) as a required slot

## Props
- copyright: string (optional)

## Slots
- brand — logo or brand area
- navigation — footer navigation component (required)
