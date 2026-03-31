---
when:
  steps: [create-component]
---

# Blueprint: Container

## When to use
Use when building a component that constrains content to a maximum width and centers it.

## Required Tokens
container:
  max-width:
    sm: { $value: "640px", $type: "dimension" }
    md: { $value: "768px", $type: "dimension" }
    lg: { $value: "1024px", $type: "dimension" }
    xl: { $value: "1280px", $type: "dimension" }

## Props
- size: enum ["sm", "md", "lg", "xl"] (default: "lg")
- padding: boolean (default: true)

## Slots
- content (required)

## Markup Guidance
- Centered with auto margins
- Max-width from container tokens based on size prop
- Horizontal padding when enabled
