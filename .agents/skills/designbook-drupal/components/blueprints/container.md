---
type: component
name: container
priority: 10
when:
  steps: [design-shell:intake, design-screen:intake, design-shell:intake, tokens:intake]
required_tokens:
  container:
    max-width:
      $extensions:
        designbook:
          renderer: container
      sm: { $value: "640px", $type: dimension }
      md: { $value: "768px", $type: dimension }
      lg: { $value: "1024px", $type: dimension }
      xl: { $value: "1280px", $type: dimension }
---

# Blueprint: Container

A universal structural wrapper that constrains content width, provides horizontal browser-edge padding, and optionally renders a header, background layer, and theme.

**Use for:** Page sections, header/footer wrappers, hero areas, modals — anywhere you need max-width.

> **No other component should apply its own max-width or horizontal browser padding.** Always wrap content in a `container` instead.

## Props
- max_width: enum [sm, md, lg, xl, full] (default: "md")
- padding_top: enum [auto, none, sm, md, lg] (default: "auto")
- padding_bottom: enum [auto, none, sm, md, lg] (default: "auto")
- display_header: boolean (default: true)
- theme: string (optional)

## Slots
- header — optional header content
- background — decorative background layer
- content (required)

## Markup

Full component.yml, Twig template, and story examples: [components/resources/container-reference.md](../components/resources/container-reference.md)
