---
title: Write Component {{ component.component }}
domain: [components]
trigger:
  steps:
    - write-component
filter:
  frameworks.component: twig
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
    - component-twig
    - component-schema
    - component-story
  properties:
    component-twig:
      path: ${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.twig
      $ref: designbook-wordpress/components/schemas.yml#/TwigComponent
    component-schema:
      path: ${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.schema.yml
      $ref: designbook-wordpress/components/schemas.yml#/TwigComponentSchema
    component-story:
      path: ${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.default.story.yml
      $ref: designbook-wordpress/components/schemas.yml#/TwigStory
---

# Write Component

Produce the complete artifacts for the selected component and requested delta. `component.props` and `component.slots` are the typed interface written into those artifacts. Existing content is the baseline for a change; blueprint defaults apply to new structure only.

## Result: component-schema

The interface every renderer and editor adapter reads: exactly the props and slots the template consumes.

## Result: component-story

Preserve the default story identity and unrelated fixture content. Every affected non-default story has its exact path and the shared story schema declared as an output in the saved definition. Preserve unaffected story files.

Completion: all declared artifacts express the requested delta and preserve the intake inventory; all required consumer edits have declared producing tasks. Build and browser verification are separate planned tasks for every affected consumer.
