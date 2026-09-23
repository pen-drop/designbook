---
title: Write Component {{ component.component }}
domain: [components]
trigger:
  steps:
    - write-component
filter:
  frameworks.component: vue
params:
  type: object
  required:
    - component
  properties:
    component:
      $ref: designbook/design/schemas.yml#/Component
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      workflow: debo-design-tokens
      type: object
    region_properties:
      $ref: designbook/design/schemas.yml#/RegionProperties
result:
  type: object
  required:
    - component-vue
    - component-story
  properties:
    component-vue:
      path: ${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.vue
      $ref: designbook-vue/components/schemas.yml#/VueComponent
    component-story:
      path: ${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.default.story.yml
      $ref: designbook-vue/components/schemas.yml#/VueStory
---

# Write Component

Produce the complete artifacts for the selected component and requested delta. Existing content is the baseline for a change; blueprint defaults apply to new structure only.

## Result: component-vue

Retain the component identity, unrelated props, slots and behavior. A requested prop or slot rename is complete only when every affected consumer declared by intake uses the new contract.

## Result: component-story

Preserve the default story identity and unrelated fixture content. Every affected non-default story has its exact path and the shared story schema declared as an output in the saved definition. Preserve unaffected story files.

Completion: all declared artifacts express the requested delta and preserve the intake inventory; all required consumer edits have declared producing tasks. Build and browser verification are separate planned tasks for every affected consumer.
