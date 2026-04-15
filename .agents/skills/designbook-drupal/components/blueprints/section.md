---
type: component
name: section
priority: 10
domain: components.layout
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

A page-builder adapter that combines container + grid with fixed named column slots. Delegates internally to the `container` component.

**Use for:** Layout Builder, Layout Paragraphs, or any page builder that requires fixed, named column slots.

> For manual template usage, prefer composing `container` and `grid` directly.

## Structure

- Delegates to [`container`](container.md) for max-width, padding, background, and theme
- Uses [`grid`](grid.md) internally to arrange columns

## Props
- max_width: enum [sm, md, lg, xl, full] — passed to container
- padding_top: enum [auto, none, sm, md, lg] (default: "auto") — passed to container
- padding_bottom: enum [auto, none, sm, md, lg] (default: "auto") — passed to container
- display_header: boolean (default: true) — passed to container
- theme: string (optional) — passed to container
- columns: enum [1..8] (default: 1) — passed to grid
- gap: enum [none, sm, md, lg] (default: "md") — passed to grid

## Slots
- header, background — passed to container
- column_1..column_8 — named column slots rendered as grid items

## Twig Slot Pattern

All slots MUST be wrapped in `{% block %}` tags for `{% embed %}` compatibility:

```twig
{% block content %}
  {% if content %}{{ content }}{% endif %}
{% endblock %}
```
