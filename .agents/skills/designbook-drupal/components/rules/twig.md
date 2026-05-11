---
trigger:
  steps: [create-component]
filter:
  frameworks.component: sdc
---

# .twig Template Constraints

See `resources/twig.md` for the full how-to.

## One Root Element with `attributes`

Every template has exactly one root element. The root MUST apply `attributes.addClass`:

```twig
<div{{ attributes.addClass(['component-name']) }}>
```

No fragments. No multiple top-level elements.

## Variable References — snake_case Only

Variables that resolve props/slots use the EXACT snake_case names declared in `.component.yml`:

```twig
{{ main_content }}     ✅
{{ main-content }}     ❌  parses as subtraction, silently empty
```

See `component-yml.md` rule for the naming spec.

## Slot Rendering

Render each slot conditionally:

```twig
{% if main_content %}{{ main_content }}{% endif %}
```

No wrapper unless the slot's surrounding markup requires it.

## `{% block %}` Wrapping — Layout Components Only

Layout components (`container`, `section`, `grid`) MUST wrap each slot in `{% block <slot> %}` tags. Required for `{% embed %}` compatibility — without it, `{% embed %}` overrides are silently ignored and the slot content disappears.

```twig
{# Layout components: #}
{% block content %}{% if content %}{{ content }}{% endif %}{% endblock %}    ✅
{% if content %}{{ content }}{% endif %}                                      ❌
```

Non-layout components render slots without `{% block %}` wrapping.

## No Hardcoded Colors

Use CSS custom properties from design tokens (`var(--color-…)`) or utility classes derived from them. No literal hex/rgb values in Twig.

## Variants Inline — One Twig File

Multi-variant components keep ALL variants in a single `.twig` file with `{% if variant == '…' %}` blocks. Never create `<name>--<variant>.twig` partial files — the SDC addon imports every `.twig` file in a component directory and partials cause import conflicts.

When variants differ only in classes, prefer conditional class assignment over duplicating markup:

```twig
{% set classes = variant == 'alternate' ? ['card', 'card-side'] : ['card'] %}
<div{{ attributes.addClass(classes) }}>
  {# shared markup #}
</div>
```
