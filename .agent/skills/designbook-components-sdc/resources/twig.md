# Part 3: Generate .twig Template

> ⛔ **NAMING RULE**: The filename must match the directory name. Component in `components/nav-main/` → file is `nav-main.twig`. Always kebab-case.

## CSS Framework Routing — Read First

> ⛔ **MANDATORY**: You **MUST** read the CSS framework skill before writing any Twig template:
>
> `@designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/SKILL.md`
>
> For example, when `DESIGNBOOK_FRAMEWORK_CSS=daisyui`, read `@designbook-css-daisyui/SKILL.md`.

The CSS framework skill is the **single source of truth** for which classes to use. It defines allowed and forbidden class patterns. Do not invent your own class naming — always follow the CSS framework skill's rules.

## Template Structure

Create a Twig template with the following structure. Use classes from the CSS framework skill — the example below shows placeholder classes that must be replaced:

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

<div{{ attributes.addClass(['[css-framework-classes]']) }}>
[For each slot:]
  {% if [slot.name] %}
    {{ [slot.name] }}
  {% endif %}
[End for]
</div>
```

**Write to file:**
```
$DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]/[componentNameKebab].twig
```

## Rules

### Slot Rendering

For each slot, render it conditionally. Wrapping elements and their classes come from the CSS framework skill:
```twig
{% if slot_name %}
  {{ slot_name }}
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
<div{{ attributes.addClass(['[css-framework-classes]']) }}>
  {# variant-specific HTML layout #}
</div>
```

> ⚠️ Variant includes are **not** SDC components — they are internal Twig partials that live in the same component directory. They do **not** get their own `.component.yml` or `.story.yml`.
