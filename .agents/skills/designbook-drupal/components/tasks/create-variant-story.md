---
name: designbook-drupal:components:create-variant-story
title: "Create Variant Story {{ component.component }}.{{ variant.id }}"
trigger:
  steps: [create-component]
filter:
  frameworks.component: sdc
priority: 10
params:
  type: object
  required: [component, variant]
  properties:
    component:
      $ref: designbook/design/schemas.yml#/Component
    variant:
      $ref: designbook/design/schemas.yml#/Variant
result:
  type: object
  required: [variant-story]
  properties:
    variant-story:
      path: "${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.{{ variant.id }}.story.yml"
      $ref: designbook-drupal/components/schemas.yml#/SdcStory
each:
  component:
    expr: "component"
    schema: { $ref: designbook/design/schemas.yml#/Component }
  variant:
    expr: "component.variants"
    schema: { $ref: designbook/design/schemas.yml#/Variant }
---

