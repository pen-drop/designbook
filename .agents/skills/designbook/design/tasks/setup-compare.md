---
title: "Setup Compare"
trigger:
  steps: [setup-compare]
params:
  type: object
  required: [story_id, reference, elements]
  properties:
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
      resolve: story_id
      from: scene_id
    reference:
      type: string
      description: "Reference hash (SHA256 of source url, first 12 hex) — identifies the Reference at references/<hash>/meta.yml."
    elements:
      type: array
      description: "Per-element id, story-side selector, and which breakpoints to cover."
      items:
        type: object
        required: [id, selector]
        properties:
          id: { $ref: ../schemas.yml#/ElementId }
          selector:
            type: string
            description: "CSS selector on the story DOM; '' ⇒ isolated story root."
          breakpoints:
            type: array
            description: "Breakpoints to capture for this element. Defaults to all breakpoints in design_tokens."
            items: { $ref: ../schemas.yml#/BreakpointId }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [story-meta, story_screenshots, reference_screenshots]
  properties:
    story-meta:
      path: designbook/stories/{{ story_id }}/meta.yml
      $ref: ../schemas.yml#/StoryMeta
    story_screenshots:
      type: array
      items:
        $ref: ../schemas.yml#/Screenshot
    reference_screenshots:
      type: array
      items:
        $ref: ../schemas.yml#/Screenshot
---

# Setup Compare

Write the story binding `stories/{{ story_id }}/meta.yml` and emit the two
screenshot lists that drive capture and baseline-filling downstream.

## Result: story-meta

Write `{ reference: <hash>, elements: [{ id, selector }] }` — one entry per
element from `elements`, carrying the story-side selector. The reference hash
binds the story to the Reference at `references/<hash>/meta.yml`.

## Result: story_screenshots

The story-side capture matrix: element × state × breakpoint, each as a
`Screenshot { element, state, breakpoint, selector: <story selector> }`.

States: every element has at least `rest`. Add one entry per interactive state
that the Reference records for that element (resolved from
`references/<hash>/meta.yml`). Story steps for non-rest states run against the
story DOM.

## Result: reference_screenshots

The reference-side capture matrix: the same element × state × breakpoint triples
as `story_screenshots`, each as a `Screenshot { element, state, breakpoint,
selector: <reference selector> }`. The reference selector for each element is
read from the matching element in `references/<hash>/meta.yml`. These are
consumed by `ensure-baseline` to fill any missing reference baselines.
