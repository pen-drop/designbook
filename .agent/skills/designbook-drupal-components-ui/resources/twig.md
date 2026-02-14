# Part 3: Generate .twig Template

> ⛔ **NAMING RULE**: The filename must match the directory name. Component in `components/nav-main/` → file is `nav-main.twig`. Always kebab-case.


Create a Twig template with helpful structure:

**Template content:**
```twig
{#
/**
 * @file
 * Template for [name] component.
 *
 * Available variables:
[For each prop:]
 * - [prop.name]: [prop.description]
[For each slot:]
 * - [slot.name]: [slot.description]
 */
#}
{% set classes = [
  'component',
  '[componentNameKebab]',
  variant ? '[componentNameKebab]--' ~ variant : '[componentNameKebab]--default',
] %}

<div{{ attributes.addClass(classes) }}>
[For each slot:]
  {% if [slot.name] %}
    <div class="[componentNameKebab]__[slot.name]">
      {{ [slot.name] }}
    </div>
  {% endif %}
[End for]
</div>
```

**Write to file:**
```
$DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]/[componentNameKebab].twig
```

## Rules

### Class Structure
Always include base BEM-style classes:
```twig
{% set classes = [
  'component',
  '[component-name]',
  variant ? '[component-name]--' ~ variant : '[component-name]--default',
] %}
```

### Slot Rendering
For each slot, create a conditional wrapper:
```twig
{% if slot_name %}
  <div class="[component-name]__[slot-name]">
    {{ slot_name }}
  </div>
{% endif %}
```

### Comments
Include a Drupal-style file docblock with available variables.

### Variant Includes

When a component has **variants with different layouts** (but the same props/slots), use a dispatcher pattern in the main template and separate `[name]--[variant].twig` includes for each layout. See [Variants Instead of Duplicate Components](../SKILL.md#variants-instead-of-duplicate-components) for the full pattern.

**Main template — dispatcher (static if/elseif, no dynamic includes):**
```twig
{% set variant = variant|default('default') %}

{% if variant == 'alternate' %}
  {% include '[component-name]--alternate.twig' with {
    attributes: attributes,
    prop1: prop1,
    slot1: slot1,
  } only %}
{% else %}
  {% include '[component-name]--default.twig' with {
    attributes: attributes,
    prop1: prop1,
    slot1: slot1,
  } only %}
{% endif %}
```

> ⚠️ Always use **static string paths** in includes. Dynamic expressions like `{% include name ~ '.twig' %}` do **not** work in Storybook.

**Variant include — `[component-name]--[variant].twig`:**
```twig
{% set classes = [
  'component',
  '[component-name]',
  '[component-name]--[variant]',
] %}

<div{{ attributes.addClass(classes) }}>
  {# variant-specific HTML layout #}
</div>
```

> ⚠️ Variant includes are **not** SDC components — they are internal Twig partials that live in the same component directory. They do **not** get their own `.component.yml` or `.story.yml`.
