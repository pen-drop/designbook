# Layout Components

Layout components provide structural framing and grid arrangement. They are **included in this skill** and should be generated from the reference definitions below.

> [!IMPORTANT]
> **Build layout components FIRST.** All other UI components reference and reuse them.

> [!IMPORTANT]
> **Use `container` everywhere you need max-width and horizontal padding (padding-inline / px).**
> The `container` component is the **single source** for constraining content width and adding horizontal padding to keep content away from the browser edges. **No other component should apply its own max-width or horizontal browser padding.** Always wrap content in a `container` instead.

> ⛔ **RULE**: Never create domain-specific layout components (e.g., `article-grid`, `blog-grid`). Always use the generic `grid` component or CSS grid classes.

> [!NOTE]
> **Token-backed values**: Layout props resolve from design tokens defined in `@designbook-css-tailwind`:
> - `max_width: md` → `max-w-md` via `--container-md` (standard Tailwind namespace, token group: `layout-width`)
> - `padding_top/padding_bottom: md` → `py-[var(--layout-spacing-md)]` (non-standard namespace → requires `var()`, token group: `layout-spacing`)
> - `gap: md` → `gap-[var(--grid-gap-md)]` (non-standard namespace → requires `var()`, token group: `grid`)

---

## `container` Component

A universal structural wrapper that constrains content width, provides horizontal browser-edge padding (padding-inline), and optionally renders a header, background layer, and theme.

**Use for:** Page sections, header/footer wrappers, hero areas, modals — anywhere you need max-width.

### component.yml

```yaml
$schema: https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json

name: Container
group: Layout
status: experimental
description: >
  Universal structural wrapper. Constrains content width (max-width),
  provides horizontal browser-edge padding (padding-inline),
  and optionally renders a header, background layer, and theme.

props:
  type: object
  properties:
    max_width:
      title: Max Width
      type: string
      enum: [sm, md, lg, xl, full]
      description: >
        Container max-width. Maps to --container-* tokens.
        "full" = no max-width constraint.

    padding_top:
      title: Padding Top
      type: string
      enum: [auto, none, sm, md, lg]
      default: auto
      description: >
        Top padding. "auto" = none normally, md when background is set.

    padding_bottom:
      title: Padding Bottom
      type: string
      enum: [auto, none, sm, md, lg]
      default: auto
      description: >
        Bottom padding. "auto" = md (always).

    display_header:
      title: Display Header
      type: boolean
      default: true
      description: >
        Whether to display the header slot content.

    theme:
      title: Theme
      type: string
      enum: [light, dark, cyberpunk, valentine]
      description: >
        Visual theme applied via data-theme attribute.

slots:
  header:
    title: Header
    description: >
      Optional header content (heading, subtitle, etc.)
      displayed above the main content. Controlled by display_header.

  background:
    title: Background
    description: >
      Decorative or functional background (images, patterns, gradients).
      Rendered behind the content layer.

  content:
    title: Content
    description: >
      Main content. Can contain anything: a grid component,
      a single article, Views output, or free-form Twig.

thirdPartySettings:
  sdcStorybook:
    disableBasicStory: true
```

### container.twig

```twig
{#
/**
 * @file
 * Container component — structural wrapper with max-width, padding, and header.
 */
#}
{% set max_width = max_width|default('md') %}
{% set padding_top = padding_top|default('auto') %}
{% set padding_bottom = padding_bottom|default('auto') %}
{% set display_header = display_header is defined ? display_header : true %}

{% set wrapper_attributes = create_attribute() %}

{# Background detection (needed for auto padding) #}
{% set has_background = background|default('')|trim|striptags %}

{# Resolve auto padding #}
{% if padding_top == 'auto' %}
  {% set padding_top = has_background or theme ? 'md' : 'none' %}
{% endif %}
{% if padding_bottom == 'auto' %}
  {% set padding_bottom = 'md' %}
{% endif %}

{# Max-width #}
{% if max_width != 'full' %}
  {% set wrapper_attributes = wrapper_attributes.addClass('max-w-' ~ max_width).addClass('mx-auto') %}
{% endif %}

{# Padding-inline (always — keeps content away from browser edges) #}
{% set wrapper_attributes = wrapper_attributes.addClass('px-4 md:px-6 lg:px-8') %}

{# Padding top/bottom via section-spacing tokens #}
{% if padding_top != 'none' %}
  {% set wrapper_attributes = wrapper_attributes.addClass('pt-[var(--layout-spacing-' ~ padding_top ~ ')]') %}
{% endif %}
{% if padding_bottom != 'none' %}
  {% set wrapper_attributes = wrapper_attributes.addClass('pb-[var(--layout-spacing-' ~ padding_bottom ~ ')]') %}
{% endif %}

{# Theme #}
{% if theme %}
  {% set wrapper_attributes = wrapper_attributes.setAttribute('data-theme', theme) %}
{% endif %}

{# Background flag #}
{% if has_background or theme %}
  {% set wrapper_attributes = wrapper_attributes.setAttribute('data-on-background', 'true') %}
{% endif %}

<div{{ wrapper_attributes.addClass('container-component') }}>
{% if has_background %}
  <div class="layout-background">
    {{ background }}
  </div>
{% endif %}
{% if display_header and header is not empty %}
  <div class="container-header">
    {{ header }}
  </div>
{% endif %}
  {{ content }}
</div>
```

### Auto Padding Logic

| `padding_top` value | No Background | With Background/Theme |
|---------------------|---------------|----------------------|
| `auto` (default) | `none` | `md` |
| `none` | `none` | `none` |
| `sm` / `md` / `lg` | as-is | as-is |

| `padding_bottom` value | Result |
|------------------------|--------|
| `auto` (default) | `md` |
| `none` | `none` |
| `sm` / `md` / `lg` | as-is |

### Story Examples

**Default container (auto padding):**
```yaml
name: Default
props:
  max_width: md
slots:
  header:
    - type: element
      tag: h2
      attributes:
        class: ["text-2xl font-bold"]
      value: "Section Title"
  content:
    - type: element
      tag: div
      attributes:
        class: ["p-8 bg-base-200 rounded"]
      value: "Content with auto padding (top=none, bottom=md)."
```

**Full-width with background (auto padding kicks in):**
```yaml
name: Full Width Background
props:
  max_width: full
  theme: dark
slots:
  background:
    - type: element
      tag: div
      attributes:
        class: ["absolute inset-0 bg-gradient-to-r from-primary to-secondary"]
  header:
    - type: element
      tag: h2
      attributes:
        class: ["text-3xl font-bold text-center"]
      value: "Hero Section"
  content:
    - type: element
      tag: p
      attributes:
        class: ["text-center text-lg"]
      value: "Auto padding adds top+bottom md because background is set."
```

---

## `grid` Component

A responsive grid that arranges items into columns with breakpoint-aware presets. Can be used standalone or inside a container.

**Use for:** Card grids, teaser lists, multi-column content — any columnar arrangement.

### component.yml

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

### grid.twig

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

### Responsive Column Presets

| `columns` | Mobile | Tablet (md) | Desktop (lg) |
|-----------|--------|-------------|---------------|
| `1` | 1 col | 1 col | 1 col |
| `2` | 1 col | 2 cols | 2 cols |
| `3` | 1 col | 2 cols | 3 cols |
| `4` | 1 col | 2 cols | 4 cols |

### Gap Mapping

| `gap` | Tailwind Class |
|-------|---------------|
| `none` | `gap-0` |
| `sm` | `gap-[var(--grid-gap-sm)]` |
| `md` | `gap-[var(--grid-gap-md)]` |
| `lg` | `gap-[var(--grid-gap-lg)]` |

### Story Examples

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

---

## `section` Component

A Layout Builder adapter that combines container + grid with 8 fixed named column slots. Delegates internally to the `container` component.

**Use for:** Drupal Layout Builder, Layout Paragraphs, or any page builder that requires fixed, named column slots.

> For manual Twig usage, prefer composing `container` and `grid` directly.

> **Layout Builder integration:** When a bundle has `composition: unstructured` and the project uses `extensions: [layout_builder]`, the `full` view mode JSONata outputs `section` components with `type: "entity"` refs in column slots. The renderer recursively resolves each block entity through its own JSONata expression.

### component.yml

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

### section.twig

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

### Story Example

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
