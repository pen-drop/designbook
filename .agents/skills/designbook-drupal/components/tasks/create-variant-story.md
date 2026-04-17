---
name: designbook-drupal:components:create-variant-story
title: "Create Variant Story {{ component }}.{{ variant.id }}"
trigger:
  steps: [create-component]
filter:
  frameworks.component: sdc
priority: 10
params:
  type: object
  required: [component, variant]
  properties:
    component: { type: string }
    variant:
      $ref: designbook/design/schemas.yml#/Variant
result:
  type: object
  required: [variant-story]
  properties:
    variant-story:
      path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.{{ variant.id }}.story.yml
      $ref: designbook-drupal/components/schemas.yml#/SdcStory
each:
  component.variants:
    $ref: designbook/design/schemas.yml#/Variant
---

