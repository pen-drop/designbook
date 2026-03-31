# Container — Markup Reference

## component.yml

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

## Twig Template

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

## Auto Padding Logic

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

## Story Examples

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
