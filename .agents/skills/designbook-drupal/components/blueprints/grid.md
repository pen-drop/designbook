---
type: component
name: grid
priority: 10
when:
  steps: [design-shell:intake, design-screen:intake, tokens:intake]
required_tokens:
  grid:
    gap:
      $extensions:
        designbook:
          renderer: gap
      sm: { $value: "1rem", $type: dimension }
      md: { $value: "1.5rem", $type: dimension }
      lg: { $value: "2rem", $type: dimension }
---

# Blueprint: Grid

A responsive grid that arranges items into columns with breakpoint-aware presets.

**Use for:** Card grids, teaser lists, multi-column content — any columnar arrangement.

## Props
- columns: enum [1, 2, 3, 4] (default: 1)
- gap: enum [none, sm, md, lg] (default: "md")

## Slots
- items — grid cells
- content — free-form alternative (use either items or content)

## Markup

Full component.yml, Twig template, and story examples: [resources/grid-reference.md](../resources/grid-reference.md)
