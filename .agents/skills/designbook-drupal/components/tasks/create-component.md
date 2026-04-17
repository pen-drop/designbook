---
title: "Create Component {{ component }}"
trigger:
  steps: [create-component]
filter:
  frameworks.component: sdc
params:
  type: object
  $ref: designbook/design/schemas.yml#/Component
  properties:
    props: { type: array, default: [] }
    variants: { type: array, default: [] }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      workflow: debo-design-tokens
      type: object
result:
  type: object
  required: [component-yml, component-twig, component-story, app-css]
  properties:
    component-yml:
      path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.component.yml
      $ref: designbook-drupal/components/schemas.yml#/ComponentYml
    component-twig:
      path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.twig
    component-story:
      path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.default.story.yml
      $ref: designbook-drupal/components/schemas.yml#/StoryYml
    app-css:
      path: ${DESIGNBOOK_CSS_APP}
each:
  component:
    $ref: designbook/design/schemas.yml#/Component
---

# Create SDC Component

Produce the three SDC files (`.component.yml`, `.twig`, `.default.story.yml`) for a single componentAll files share the same kebab-case base name as the component directory.

## Result: component-twig

The Twig template for the component. Shape and content conventions are defined in `resources/twig.md`.

## Result: component-story

The default story (`<component>.default.story.yml`). 

