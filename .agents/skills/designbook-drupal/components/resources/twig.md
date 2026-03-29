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
$DESIGNBOOK_HOME/components/[componentNameKebab]/[componentNameKebab].twig
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

### Inline Variants

> ⛔ **NO PARTIAL TWIG FILES**: Never create separate `[name]--[variant].twig` files. All variant markup **must be inlined** in the single main `.twig` template. The `storybook-addon-sdc` imports ALL `.twig` files in a component directory, and multiple files cause import conflicts. Each component has **exactly one `.twig` file**.

When a component has **variants with different markup** (but the same props/slots), use `{% if %}`/`{% elseif %}` blocks inside the single template file.

**Inline variant pattern:**
```twig
{% set variant = variant|default('default') %}

{% if variant == 'alternate' %}
  <div{{ attributes.addClass(['[alternate-classes]']) }}>
    {# alternate variant markup #}
  </div>
{% else %}
  <div{{ attributes.addClass(['[default-classes]']) }}>
    {# default variant markup #}
  </div>
{% endif %}
```

> **Tip**: When variants only differ in a few CSS classes, prefer conditional class assignment over duplicating the entire template:
>
> ```twig
> {% set variant = variant|default('default') %}
> {% set classes = variant == 'alternate' ? ['card', 'card-side'] : ['card'] %}
>
> <div{{ attributes.addClass(classes) }}>
>   {# shared markup — used by all variants #}
> </div>
> ```
