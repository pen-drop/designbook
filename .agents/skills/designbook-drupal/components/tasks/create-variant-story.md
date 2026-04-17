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
      $ref: designbook-drupal/components/schemas.yml#/StoryYml
each:
  component.variants:
    $ref: designbook/design/schemas.yml#/Variant
---

# Create SDC Variant Story

Produce one `.story.yml` file for a single variant of a component. Runs once per `(component, variant)` pair alongside `create-component`, which handles the `.component.yml`, `.twig`, and `.default.story.yml`.

## Result: variant-story

The variant story file (`<component>.<variant.id>.story.yml`). Must declare `component: <provider>:<component>` and `variant: <variant.id>` so the SDC Storybook addon pairs it with the matching variant entry in `.component.yml`.
