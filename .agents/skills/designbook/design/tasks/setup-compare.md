---
title: "Setup Compare"
trigger:
  steps: [setup-compare]
params:
  type: object
  required: [story_id, reference_dir, elements]
  properties:
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
      resolve: story_id
      from: scene_id
    reference_url:
      type: string
      default: ""
      description: "Source URL for the design reference."
    reference_dir:
      type: string
      description: "Absolute path to the Reference directory. The directory basename is the Reference hash used by story meta."
    elements:
      type: array
      description: "Per-element id, story-side selector, reference-side selector, states, and which breakpoints to cover."
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
          reference_selector:
            type: string
            description: "CSS selector on the reference page. Defaults to selector when omitted."
          states:
            type: array
            items:
              $ref: ../schemas.yml#/CaptureState
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [story-meta, reference-meta, story_screenshots, reference_screenshots]
  properties:
    story-meta:
      path: designbook/stories/{{ story_id }}/meta.yml
      $ref: ../schemas.yml#/StoryMeta
    reference-meta:
      path: "{{ reference_dir }}/meta.yml"
      $ref: ../schemas.yml#/Reference
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

Write the story binding `stories/{{ story_id }}/meta.yml`, write the Reference
binding `{{ reference_dir }}/meta.yml`, and emit the two screenshot lists that
drive capture and baseline-filling downstream.

## Result: story-meta

Write `{ reference: <hash>, elements: [{ id, selector }] }` — one entry per
element from `elements`, carrying the story-side selector. The reference hash
is the basename of `reference_dir` and binds the story to the Reference at
`references/<hash>/meta.yml`.

## Result: reference-meta

Write a `Reference` to `{{ reference_dir }}/meta.yml`:

- `source.url`: `reference_url` when supplied.
- `elements`: one entry per element from `elements`, carrying the reference-side
  selector. Use `reference_selector` when present, otherwise `selector`.
- `id`: keep the stable comparison subject id from intake. Entity stories use
  `entity-<entity_type>-<bundle>-<view_mode>`; scene regions use ids such as
  `scene-header`. The `<view_mode>` segment may be `full`; that is different
  from full-area capture. The id names what is being compared, not whether
  capture uses the story root.
- `states`: each element's supplied states, defaulting to `[{ name: rest, steps: [] }]`.
- `breakpoints`: each element's supplied breakpoints, defaulting to every
  breakpoint id in `design_tokens`.
- `extract`: `"extract.json"`.
- `assets_dir`: `"assets/"`.

## Result: story_screenshots

The story-side capture matrix: element × state × breakpoint, each as a
`Screenshot { element, state, breakpoint, selector: <story selector> }`.

States: every element has at least `rest`. Add one entry per interactive state
that the element records. Story steps for non-rest states run against the story
DOM.

## Result: reference_screenshots

The reference-side capture matrix: the same element × state × breakpoint triples
as `story_screenshots`, each as a `Screenshot { element, state, breakpoint,
selector: <reference selector> }`. These are consumed by `ensure-baseline` to
fill any missing reference baselines.
