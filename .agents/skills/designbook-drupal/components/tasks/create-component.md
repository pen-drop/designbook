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
      $ref: designbook-drupal/components/schemas.yml#/SdcComponent
    component-twig:
      path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.twig
    component-story:
      path: ${DESIGNBOOK_HOME}/components/{{ component }}/{{ component }}.default.story.yml
      $ref: designbook-drupal/components/schemas.yml#/SdcStory
    app-css:
      path: ${DESIGNBOOK_CSS_APP}
each:
  component:
    $ref: designbook/design/schemas.yml#/Component
---


