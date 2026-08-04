---
title: "Author page content payload for one content unit"
trigger:
  steps: [sync-to:transform-content]
domain: [data-mapping]
params:
  type: object
  required: [content_units]
  properties:
    content_units:
      type: array
      description: Ordered content units from the resolve-filter stage (Scene path).
      items:
        $ref: ../schemas.yml#/ContentUnit
result:
  type: object
  required: [content-file]
  properties:
    content-file:
      path: "$DESIGNBOOK_DATA/sync/content/{{ content_unit.content_ref }}.yml"
      validators: [data]
      description: >
        The content-entity payload YAML staged for one content unit, keyed by its
        deterministic content_ref. sync-content imports the whole staging directory.
each:
  content_unit:
    expr: "content_units"
    schema:
      $ref: ../schemas.yml#/ContentUnit
---

# Transform Content

Author the content-entity payload for one content unit, written to the content staging directory as the terminal step. Runs once per unit in the ordered `content_units` list (empty for `unit: data-model`, so no instances are emitted there).

## Result: content-file

Embed the unit's `content_ref` verbatim as the entity uuid so a re-sync produces byte-identical identity and `content_exists_cmd` recognises it — the deterministic-uuid idempotency contract.

Pick the payload shape from `content_unit.build_form`, following the loaded build-form blueprint's content-payload guidance:

- `layout-builder`, `role: block` — a `block_content` payload for the Scene's resolved component subtree carried in `content_unit.payload`.
- `layout-builder`, `role: page` — the page entity whose `layout_builder__layout` references the block units (by the `content_ref`s recorded in `content_unit.payload`), in order.
- `canvas`, `role: page` — a `canvas_page` payload carrying the inline component tree from `content_unit.payload`.

Write the authored payload to `{{ file }}`.
