# Grid — Markup Reference

## component.yml

```yaml
$schema: https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json

name: Grid
group: Layout
status: experimental
description: >
  Responsive grid layout with column presets. Arranges items into
  columns that adapt to screen size. Use standalone or inside a container.

props:
  type: object
  properties:
    columns:
      title: Columns
      type: integer
      enum: [1, 2, 3, 4]
      description: >
        Responsive column preset:
        1 = 1 column everywhere.
        2 = 1 mobile, 2 from md.
        3 = 1 mobile, 2 md, 3 lg.
        4 = 1 mobile, 2 md, 4 lg.

    gap:
      title: Gap
      type: string
      enum:
        - none
        - sm
        - md
        - lg
      description: >
        Gap between grid items. Uses Tailwind built-in spacing.

slots:
  items:
    title: Grid Items
    description: >
      Items displayed as grid cells.

  content:
    title: Content
    description: >
      Free-form content. Use either items or content, not both.

thirdPartySettings:
  sdcStorybook:
    disableBasicStory: true
```

## Twig Template

```twig
{#
/**
 * @file
 * Grid component — responsive column layout.
 */
#}
{% set columns = columns|default(1) %}
{% set gap = gap|default('md') %}

{# Responsive column presets #}
{% set column_classes = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
} %}

{# Gap mapping to grid tokens #}
{% set gap_classes = {
  'none': 'gap-0',
  'sm': 'gap-[var(--grid-gap-sm)]',
  'md': 'gap-[var(--grid-gap-md)]',
  'lg': 'gap-[var(--grid-gap-lg)]',
} %}

{% set grid_class = column_classes[columns]|default('grid-cols-1') %}
{% set gap_class = gap_classes[gap]|default('gap-4') %}

{% if items is iterable and items|length > 0 %}
<div class="grid {{ grid_class }} {{ gap_class }}">
  {% for item in items %}
    {{ item }}
  {% endfor %}
</div>
{% else %}
  {{ content }}
{% endif %}
```

## Responsive Column Presets

| `columns` | Mobile | Tablet (md) | Desktop (lg) |
|-----------|--------|-------------|---------------|
| `1` | 1 col | 1 col | 1 col |
| `2` | 1 col | 2 cols | 2 cols |
| `3` | 1 col | 2 cols | 3 cols |
| `4` | 1 col | 2 cols | 4 cols |

## Gap Mapping

| `gap` | Tailwind Class |
|-------|---------------|
| `none` | `gap-0` |
| `sm` | `gap-[var(--grid-gap-sm)]` |
| `md` | `gap-[var(--grid-gap-md)]` |
| `lg` | `gap-[var(--grid-gap-lg)]` |

## Story Examples

**3-column card grid:**
```yaml
name: Grid 3
props:
  columns: 3
  gap: md
slots:
  items:
    - type: component
      component: "COMPONENT_NAMESPACE:card"
      slots:
        title: "Card 1"
    - type: component
      component: "COMPONENT_NAMESPACE:card"
      slots:
        title: "Card 2"
    - type: component
      component: "COMPONENT_NAMESPACE:card"
      slots:
        title: "Card 3"
```

**2-column grid:**
```yaml
name: Grid 2
props:
  columns: 2
  gap: lg
slots:
  items:
    - type: component
      component: "COMPONENT_NAMESPACE:card"
      slots:
        title: "Card 1"
    - type: component
      component: "COMPONENT_NAMESPACE:card"
      slots:
        title: "Card 2"
```
