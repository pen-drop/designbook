---
title: "Setup Compare"
trigger:
  steps: [setup-compare]
params:
  type: object
  required: [story_id, breakpoints]
  properties:
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
      resolve: story_id
      from: scene_id
    reference: { type: array, default: [] }
    reference_folder:
      $ref: ../schemas.yml#/ReferenceFolder
      default: ""
    regions:
      type: array
      default: []
      items:
        $ref: ../schemas.yml#/Region
    breakpoints: { type: array }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [story-meta, checks]
  properties:
    story-meta:
      path: designbook/stories/{story_id}/meta.yml
      type: object
      $ref: ../schemas.yml#/StoryMeta
    checks:
      type: array
      items:
        $ref: ../schemas.yml#/Check
---

# Setup Compare

Build the `meta.yml` configuration for the story and return the runtime
`checks` matrix that drives the capture and compare stages.

`regions` is a list of `Region { id, selector, reference_selector }` provided by the
caller. Use it when the workflow chose explicit review surfaces (e.g. shell → header/footer
with their real story + reference selectors; an entity → its reference selector). When
`regions` is empty, default to a single full-page region:
`[{ id: full, selector: "", reference_selector: "" }]`.

Use the first item from `reference[]` when it is already present. If it is
empty and `{reference_folder}/extract.json` exists, derive the reference source
from that file instead.

If no reference source can be derived, still emit the breakpoint × region
matrix so downstream stages can reuse existing reference screenshots from the
reference folder.

## States

The check matrix is breakpoint × region × **state**. Every region has at least the
`rest` state. When a region contains an `interactive[]` element with a `behavior`
(from `extract.json`, or persisted under the region's `states` in `meta.yml`), add a
check per additional state. For each check set `state`, `steps` (the interactions
that reach it — empty for `rest`), and `file_suffix` (`""` for `rest`, `--{state}`
otherwise). A story with no behaviors yields rest-only checks — identical to the
prior breakpoint × region matrix, no new screenshots.

## Region = id + two selectors

A region is a `{ id, selector, reference_selector }` triple. For each emitted check, set:
- `region` = `region.id` (the clean label used in the screenshot filename and score, e.g. `header`, `footer`, `full`)
- `selector` = `region.selector` (crops the STORY; `""` ⇒ full story viewport)
- `reference_selector` = `region.reference_selector` (crops the REFERENCE; `""` ⇒ full reference page)

Two selectors because the story DOM (design-system components, e.g. `.page__header`) differs
from the reference DOM (e.g. Angular `app-site-header`). There is no landmark guessing — the
caller supplies the real selector per surface. A selector that matches nothing on one side
falls back to that side's full capture (see `playwright-capture`), so an entity whose story
is an isolated component (`selector: ""`) keeps the full component while the reference crops
to `reference_selector`.
