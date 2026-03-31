---
type: component
name: grid
when:
  steps: [create-component]
---

# Blueprint: Grid

## When to use
Use when building a component that arranges children in a responsive grid layout.

## Required Tokens
grid:
  gap:
    sm: { $value: "1rem", $type: "dimension" }
    md: { $value: "1.5rem", $type: "dimension" }
    lg: { $value: "2rem", $type: "dimension" }

## Props
- columns: number (default: 3)
- gap: enum ["sm", "md", "lg"] (default: "md")

## Slots
- items (required)

## Markup Guidance
- CSS Grid with responsive column count
- Gap from grid tokens
- Single column on mobile, scales up to columns prop at desktop
