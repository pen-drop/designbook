---
type: component
name: section
priority: 10
when:
  steps: [design-shell:intake, design-screen:intake, design-shell:intake, tokens:intake]
required_tokens:
  section:
    padding-y:
      $extensions:
        designbook:
          renderer: spacing
      sm: { $value: "2rem", $type: dimension }
      md: { $value: "4rem", $type: dimension }
      lg: { $value: "6rem", $type: dimension }
---

# Blueprint: Section

A Layout Builder adapter that combines container + grid with 8 fixed named column slots. Delegates internally to the `container` component.

**Use for:** Drupal Layout Builder, Layout Paragraphs, or any page builder that requires fixed, named column slots.

> For manual Twig usage, prefer composing `container` and `grid` directly.

## Props
- max_width: enum [sm, md, lg, xl, full]
- padding_top: enum [auto, none, sm, md, lg] (default: "auto")
- padding_bottom: enum [auto, none, sm, md, lg] (default: "auto")
- display_header: boolean (default: true)
- theme: string (optional)
- columns: enum [1..8] (default: 1)
- gap: enum [none, sm, md, lg] (default: "md")

## Slots
- header, background — passed to container
- column_1..column_8 — named column slots

## Markup

Full component.yml, Twig template, and story examples: [components/resources/section-reference.md](../components/resources/section-reference.md)
