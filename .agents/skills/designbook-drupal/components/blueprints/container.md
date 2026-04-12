---
type: component
name: container
priority: 10
when:
  steps: [design-shell:intake, design-screen:intake, tokens:intake]
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

## Twig Slot Pattern

All slots MUST be wrapped in `{% block %}` tags for `{% embed %}` compatibility:

```twig
{% block background %}
  {% if background %}{{ background }}{% endif %}
{% endblock %}

{% block header %}
  {% if header and display_header %}
    <div class="container__header">{{ header }}</div>
  {% endif %}
{% endblock %}

{% block content %}
  {% if content %}{{ content }}{% endif %}
{% endblock %}
```

## Token Integration

Container max-width values should come from design tokens (`--container-sm`, `--container-md`, etc.) — see `layout-constraints.md` rule for enforcement details.

When the design reference uses a wider wrapper than the default token set provides, add a new size tier (e.g. `2xl`) to both the token file and the container's `max_width` enum.

