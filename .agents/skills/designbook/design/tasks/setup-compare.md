---
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
        $ref: ../schemas.yml#/RegionId
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

Use `regions` when the workflow already chose an explicit review surface.
Otherwise derive the default regions from the story type:
- shell stories → `["header", "footer"]`
- all other stories → `["full"]`

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
