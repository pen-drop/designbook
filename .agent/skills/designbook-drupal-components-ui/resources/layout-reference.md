# Layout Components

Layout components provide the grid system and structural containers. They are **included in this skill** and should be generated from the reference definitions below.

> ⛔ **RULE**: Never create `article-teaser-grid`, `blog-grid`, or similar domain-specific layout components. Always use the generic `layout` component with appropriate grid classes.

**Reference source:** `daisy-cms/web/themes/custom/daisy_cms_daisyui/components/layout/`

---

## `layout` Component

A flexible layout component that defines structure, grid, alignment, spacing, and theming options. It can include an optional header, background area, and a list of items arranged in a grid.

### component.yml

```yaml
$schema: https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json

name: Layout
group: Layout
status: experimental
description: >
  A flexible layout component that defines structure, grid, alignment, spacing, and theming.
  Includes optional header, background area, and items arranged in a grid.

props:
  type: object
  properties:
    attributes:
      title: Layout attributes
      $ref: "ui-patterns://attributes"
      description: >
        Classes applied to the main layout container (e.g., grid-3, container-md).

    alignment_attributes:
      title: Alignment attributes
      $ref: "ui-patterns://attributes"
      description: >
        Classes controlling content alignment within the layout.

    spacing_attributes:
      title: Spacing attributes
      $ref: "ui-patterns://attributes"
      description: >
        Classes for padding, margins, and gaps (e.g., pb-auto, pt-auto).

    theme:
      title: Theme
      type: string
      enum:
        - light
        - dark
        - cyberpunk
        - valentine
      description: >
        Visual style: light, dark, cyberpunk, or valentine.

    display_header:
      title: Display header
      type: boolean
      description: >
        Toggles header slot visibility.

slots:
  background:
    title: Background
    description: >
      Decorative or functional background (images, patterns, gradients).

  header:
    title: Header
    description: >
      Top section, controlled by 'display_header' prop.

  content:
    title: Content
    description: >
      Content displayed inside the layout.

  items:
    title: Grid Items
    description: >
      Items displayed as grid items. Use either items or content.

thirdPartySettings:
  sdcStorybook:
    disableBasicStory: true
```

### layout.twig

```twig
{#
/**
 * @file
 * Layout component.
 */
#}
{% set attributes = attributes|default(create_attribute()) %}
{% set spacing_attributes = spacing_attributes|default(create_attribute()) %}
{% set alignment_attributes = alignment_attributes|default(create_attribute()) %}
{% set wrapper_attributes = create_attribute(spacing_attributes) %}

{% set class = attributes.class|default('') %}
{% set classes = class|split(' ') %}

{% set main_classes = classes|filter(c => 'grid-' not in c or 'gap-' in c)|join(' ') %}
{% set grid_classes = classes|filter(c => 'grid-' in c )|join(' ') %}
{% set gap_classes = classes|filter(c => 'gap-' in c )|join(' ') %}
{% if gap_classes is empty %}
    {% set gap_classes = 'gap-md' %}
{% endif %}

{%- set background -%}
    {% if background['content'][0]['link'] is empty%}
        {{- background -}}
    {% endif %}
{% endset %}

{% set theme = theme == 'light' ? '' : theme %}
{% set has_background = background|trim|striptags%}
{% set on_background = has_background or theme %}
{% if on_background %}
    {% set wrapper_attributes = wrapper_attributes.setAttribute('data-on-background', "true") %}
{% endif %}

{% if theme %}
    {% set wrapper_attributes = wrapper_attributes.setAttribute('data-theme', theme) %}
{% endif %}

{% set grid %}
    {% if items is sequence %}
    <div{{ create_attribute().addClass('grid').addClass(grid_classes).addClass(gap_classes) }}>
        {% block grid_items %}
            {% for item in items %}
                {% block grid_item %}
                    <div{{ create_attribute().addClass('grid-item') }}>
                        {{ item }}
                    </div>
                {% endblock %}
            {%- endfor -%}
        {% endblock %}
    </div>
    {% else %}
        {{- items -}}
    {% endif %}
{% endset %}


<div{{ wrapper_attributes.addClass('layout') }}>
{% if has_background %}
    <div class="layout-background">
        {{ background }}
    </div>
{% endif %}
<div{{ create_attribute({class: main_classes}).merge(attributes|without('class')) }}>
    {% if display_header %}
        <div class="pb-sm">{{ header }}</div>
    {% endif %}
    {{ grid }}
    {{ content }}
</div>
</div>
```

### Story Examples

**Grid 1 (single column):**
```yaml
name: Grid 1
props:
  spacing_attributes:
    class: [ "pb-auto", "pt-auto" ]
  attributes:
    class: [ "grid-1 container-md" ]
slots:
  items:
    - type: component
      component: "[provider]:card"
      slots:
        title: "Card title"
        text:
          type: html_tag
          tag: p
          value: "Card description."
```

**Grid 50x50 (two columns):**
```yaml
name: Grid 50x50
props:
  spacing_attributes:
    class: [ "pb-auto", "pt-auto" ]
  attributes:
    class: [ "grid-2 container-md" ]
slots:
  items:
    - type: component
      component: "[provider]:card"
      slots:
        title: "Card 1"
    - type: component
      component: "[provider]:card"
      slots:
        title: "Card 2"
```

**Grid 33x33x33 (three columns):**
```yaml
name: Grid 33x33x33
props:
  spacing_attributes:
    class: [ "pb-auto", "pt-auto" ]
  attributes:
    class: [ "grid-3 container-md" ]
slots:
  items:
    - type: component
      component: "[provider]:card"
      slots:
        title: "Card 1"
    - type: component
      component: "[provider]:card"
      slots:
        title: "Card 2"
    - type: component
      component: "[provider]:card"
      slots:
        title: "Card 3"
```

### Available Grid Classes

| Class | Columns |
|-------|---------|
| `grid-1` | 1 column |
| `grid-2` | 2 equal columns (50/50) |
| `grid-3` | 3 equal columns (33/33/33) |
| `grid-4` | 4 equal columns (25/25/25/25) |
| `container-md` | Centered with max-width |

---

## `layout_columns` Component

A layout wrapper for Drupal's layout systems (Layout Builder, Layout Paragraphs) which require fixed, named column slots. Supports up to 8 columns and internally renders the `layout` component.

> For manual Twig usage or more flexible layouts, prefer using `layout` directly.

### component.yml

```yaml
$schema: https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json

name: Layout columns
group: Layout
status: experimental
description: >
  A layout wrapper for Drupal layout systems with fixed, named column slots.
  Supports up to 8 columns and renders the "layout" component internally.

props:
  type: object
  properties:
    display_header:
      title: Header
      type: boolean
      description: Renders the header slot above content.
    theme:
      title: Theme
      type: string
      enum:
        - light
        - dark
        - cyberpunk
        - valentine
    items_count:
      type: integer
      title: Cells
      enum: [1, 2, 3, 4, 5, 6, 7, 8]
      description: Number of column slots to render.
    attributes:
      title: Layout attributes
      $ref: "ui-patterns://attributes"
    alignment_attributes:
      title: Alignment attributes
      $ref: "ui-patterns://attributes"
    spacing_attributes:
      title: Spacing attributes
      $ref: "ui-patterns://attributes"

slots:
  background:
    title: Background media
    description: Background element rendered behind content.
  header:
    title: Header
    description: Section heading, shown when display_header is enabled.
  column_1:
    title: First Column
  column_2:
    title: Second Column
  column_3:
    title: Third Column
  column_4:
    title: Fourth Column
  column_5:
    title: Fifth Column
  column_6:
    title: 6 Column
  column_7:
    title: 7 Column
  column_8:
    title: 8 Column

thirdPartySettings:
  sdcStorybook:
    disableBasicStory: true
```

### layout_columns.twig

```twig
{#
/**
 * @file
 * Layout columns — wraps the layout component with fixed column slots.
 */
#}

{% set items_count = items_count|default(4) %}
{% set attributes = attributes|default(create_attribute()) %}
{% set spacing_attributes = spacing_attributes|default(create_attribute()) %}
{% set alignment_attributes = alignment_attributes|default(create_attribute()) %}

{% set items = [] %}
{%- for i in 1..items_count -%}
  {% set items = items|merge([_context['column_' ~ i ]]) %}
{% endfor %}

{{ include ('[provider]:layout', {
    attributes: attributes,
    spacing_attributes: spacing_attributes,
    items: items,
    background: background,
    theme: theme,
    display_header: display_header,
    item_attributes: alignment_attributes,
    header: header
  })
}}
```

> **Note:** Replace `[provider]` in `layout_columns.twig` with the actual theme provider (e.g., `daisy_cms_daisyui`).

### Story Example

```yaml
name: Grid 2
props:
  attributes:
    class: ["container-md grid-2"]
  spacing_attributes:
    class: ["pt-auto pb-auto"]
  theme: dark
slots:
  column_1:
    - type: component
      component: "[provider]:card"
      slots:
        title: "Card 1"
  column_2:
    - type: component
      component: "[provider]:card"
      slots:
        title: "Card 2"
```
