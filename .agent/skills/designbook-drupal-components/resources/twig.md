# Part 3: Generate .twig Template

## Build Twig Template

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
