---
type: component
name: section
when:
  steps: [create-component]
---

# Blueprint: Section

## When to use
Use when building a component that wraps content in a vertical section with consistent spacing.

## Required Tokens
section:
  padding-y:
    sm: { $value: "2rem", $type: "dimension" }
    md: { $value: "4rem", $type: "dimension" }
    lg: { $value: "6rem", $type: "dimension" }

## Props
- background: string (optional) — semantic color name
- width: enum ["full", "contained"] (default: "contained")

## Slots
- content (required)

## Markup Guidance
- Outer wrapper with vertical padding from section tokens
- Inner container with max-width constraint when width="contained"
- Background color mapped to design tokens when set
