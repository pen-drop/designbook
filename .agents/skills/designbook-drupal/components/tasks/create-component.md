---
title: "Create Component {{ component.component }}"
trigger:
  steps: [create-component]
filter:
  frameworks.component: sdc
params:
  type: object
  required: [component]
  properties:
    component:
      $ref: designbook/design/schemas.yml#/Component
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      workflow: debo-design-tokens
      type: object
    region_properties:
      $ref: designbook/design/schemas.yml#/RegionProperties
      resolve: region_properties
      from: reference_url
result:
  type: object
  required: [component-yml, component-twig, component-story]
  properties:
    component-yml:
      path: "${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.component.yml"
      $ref: designbook-drupal/components/schemas.yml#/SdcComponent
    component-twig:
      path: "${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.twig"
    component-story:
      path: "${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.default.story.yml"
      $ref: designbook-drupal/components/schemas.yml#/SdcStory
    component-js:
      path: "${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.js"
each:
  component:
    expr: "components"
    schema: { $ref: designbook/design/schemas.yml#/Component }
---

# Create Component

Produce the SDC artefacts for a single component:

- `{{ component.component }}.component.yml` — schema (props, slots, libraries)
- `{{ component.component }}.twig` — markup template
- `{{ component.component }}.default.story.yml` — default story
- `{{ component.component }}.js` — the component's JavaScript (the default integration point for any component scripting), when the component needs it — to implement a declared `interactive[]` `behavior`, or for any other enhancement. Omit when none is needed.

## Template Mode (`component.design_hint.markup`)

When `component.design_hint.markup` is non-empty, treat it as the **starting template** for the Twig file:

- The markup is a sketch of the desired DOM and Twig structure (props, slots, conditionals). Preserve its shape, tags, and class hints.
- Consult the matching blueprint (`designbook-drupal/components/blueprints/<group>.md`) for idiom and conventions — apply them where they do not contradict the supplied markup.
- Reconcile differences in favour of the supplied markup for structure; in favour of the blueprint for naming, accessibility, and library wiring.
- Map any `component.design_hint.props` (loose schema) onto the formal `props:` block in `<name>.component.yml`. Only `component.design_hint.atoms_used` informs the `libraryDependencies` and any `{% include 'leando:<atom>' %}` calls.

When `component.design_hint.markup` is empty, fall back to the blueprint defaults exclusively.

## Steps

1. Read the blueprint for `component.group` if present.
2. If `component.design_hint.markup` is set, lift the markup into `<name>.twig` and clean up Angular-isms (handlers, `[innerHTML]`, etc.) per the migration rules.
3. Derive `<name>.component.yml` from `component.slots` + `component.design_hint.props`.
4. **Render referenced children via slots, not props.** When `component.slots` includes a slot that holds rendered child entities (a `type: reference` field that targets a renderable bundle, e.g. a Wegweiser's `signage_item` cards), declare it as a **slot** in `<name>.component.yml` and render it in the Twig with `{{ slotName }}` (or `{% block slotName %}{% endblock %}`) — the resolved child component markup is injected there. Do NOT declare referenced children as a flat data prop and do NOT iterate per-child fields in the parent Twig; each child bundle has its own component + mapping that renders those fields.
5. Generate the default story exercising every slot and the default of every prop.
