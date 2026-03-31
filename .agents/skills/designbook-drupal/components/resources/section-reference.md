# Section — Markup Reference

> **Layout Builder integration:** When a bundle has `composition: unstructured` and the project uses `extensions: [layout_builder]`, the `full` view mode JSONata outputs `section` components with `type: "entity"` refs in column slots. The renderer recursively resolves each block entity through its own JSONata expression.

## component.yml

```yaml
$schema: https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json

name: Section
group: Layout
status: experimental
description: >
  Layout Builder adapter. Combines container (max-width, padding, background)
  with grid (responsive columns) and provides 8 fixed column slots.
  Delegates to container internally.

props:
  type: object
  properties:
    max_width:
      title: Max Width
      type: string
      enum: [sm, md, lg, xl, full]
      description: Container max-width. Passed to container component.

    padding_top:
      title: Padding Top
      type: string
      enum: [auto, none, sm, md, lg]
      default: auto
      description: Top section padding. Passed to container component.

    padding_bottom:
      title: Padding Bottom
      type: string
      enum: [auto, none, sm, md, lg]
      default: auto
      description: Bottom section padding. Passed to container component.

    display_header:
      title: Display Header
      type: boolean
      default: true
      description: Whether to display the header. Passed to container component.

    theme:
      title: Theme
      type: string
      enum: [light, dark, cyberpunk, valentine]
      description: Visual theme. Passed to container component.

    columns:
      title: Columns
      type: integer
      enum: [1, 2, 3, 4, 5, 6, 7, 8]
      description: Number of column slots to render in a grid.

    gap:
      title: Gap
      type: string
      enum: [none, sm, md, lg]
      description: Gap between columns. Uses Tailwind built-in spacing.

slots:
  header:
    title: Header
    description: Header content. Passed to container component.
  background:
    title: Background media
    description: Background element. Passed to container component.
  column_1:
    title: Column 1
  column_2:
    title: Column 2
  column_3:
    title: Column 3
  column_4:
    title: Column 4
  column_5:
    title: Column 5
  column_6:
    title: Column 6
  column_7:
    title: Column 7
  column_8:
    title: Column 8

thirdPartySettings:
  sdcStorybook:
    disableBasicStory: true
```

## Twig Template

```twig
{#
/**
 * @file
 * Section component — Layout Builder adapter.
 * Delegates to container + grid internally.
 */
#}
{% set columns = columns|default(1) %}
{% set gap = gap|default('md') %}

{# Collect column slots into items array #}
{% set items = [] %}
{% for i in 1..columns %}
  {% set col = _context['column_' ~ i] %}
  {% if col is not empty %}
    {% set items = items|merge([col]) %}
  {% endif %}
{% endfor %}

{# Build grid content #}
{% set grid_content %}
  {{ include('COMPONENT_NAMESPACE:grid', {
    columns: columns,
    gap: gap,
    items: items,
  }) }}
{% endset %}

{# Delegate to container #}
{{ include('COMPONENT_NAMESPACE:container', {
  max_width: max_width,
  padding_top: padding_top,
  padding_bottom: padding_bottom,
  display_header: display_header,
  theme: theme,
  header: header,
  background: background,
  content: grid_content,
}) }}
```

> **Note:** `COMPONENT_NAMESPACE` is resolved from `designbook.config.yml` at generation time. Use the actual value (e.g., `test_integration_drupal`) in generated Twig files.

## Story Example

```yaml
name: Section 3 Columns
props:
  max_width: md
  padding_top: md
  padding_bottom: md
  columns: 3
  gap: md
  theme: dark
slots:
  column_1:
    - type: component
      component: "COMPONENT_NAMESPACE:card"
      slots:
        title: "Card 1"
  column_2:
    - type: component
      component: "COMPONENT_NAMESPACE:card"
      slots:
        title: "Card 2"
  column_3:
    - type: component
      component: "COMPONENT_NAMESPACE:card"
      slots:
        title: "Card 3"
```
