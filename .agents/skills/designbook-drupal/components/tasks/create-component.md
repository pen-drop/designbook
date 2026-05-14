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
result:
  type: object
  required: [component-yml, component-twig, component-story, app-css]
  properties:
    component-yml:
      path: "${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.component.yml"
      $ref: designbook-drupal/components/schemas.yml#/SdcComponent
    component-twig:
      path: "${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.twig"
    component-story:
      path: "${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.default.story.yml"
      $ref: designbook-drupal/components/schemas.yml#/SdcStory
    app-css:
      path: ${DESIGNBOOK_CSS_APP}
each:
  component:
    expr: "components"
    schema: { $ref: designbook/design/schemas.yml#/Component }
---

# Create Component

Produce the three SDC artefacts for a single component:

- `{{ component.component }}.component.yml` — schema (props, slots, libraries)
- `{{ component.component }}.twig` — markup template
- `{{ component.component }}.default.story.yml` — default story

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
4. Generate the default story exercising every slot and the default of every prop.
5. Append component-specific styles to `${DESIGNBOOK_CSS_APP}` only when a class introduced here is not already covered by tokens.

## Parsing Heuristics

When `component.design_hint` is loose natural language, use the following heuristics to derive component name, slots, props, and variants.

### Component Name Detection

- **Common types:** card, button, hero, modal, accordion, alert, badge, chip, stat, figure, pagination, empty-state, search-filter, sidebar, navigation
- **Inference fallback:** derive from structure (e.g., "box with title and text" → `content-box`)

### Slot Detection Keywords

| User says                                       | Maps to slot      |
| ----------------------------------------------- | ----------------- |
| image, picture, photo, graphic, avatar          | `image` / `media` |
| title, headline, heading                        | `title`           |
| preheadline, kicker, eyebrow                    | `preheadline`     |
| subheading, subtitle                            | `subtitle`        |
| text, body, description, content, message, copy | `body`            |
| button, CTA, action, link                       | `action`          |
| icon                                            | `icon`            |
| header, footer, sidebar                         | structural slots  |

**Ordering:** list slots in visual/reading order (top → bottom, left → right), matching the sequence described by the user.

### Variant Detection

- **Style modifiers:** "can be X or Y", "X, Y, or Z style", "types: X, Y"
- **Common patterns:**
  - `default` / `outline` / `ghost` (buttons)
  - `info` / `warning` / `error` / `success` (alerts)
  - `vertical` / `horizontal` (cards)
  - `small` / `medium` / `large` (sizing)

### Prop Detection

- **Behavioral:** disabled, loading, expanded, collapsed, active
- **Interactive:** clickable, toggleable, collapsible
- **Size/Scale:** small, medium, large, compact, full-width
- **State:** enabled/disabled, open/closed, visible/hidden
- **From variants:** "can be info or warning" → `variant` prop with enum
- **Character limits:** "150 character text" → note in description, don't create prop
