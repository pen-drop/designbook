---
trigger:
  steps: [create-sample-data]
domain: [sample-data]
params:
  type: object
  required: [section_id, bundle, data_model, components_dir]
  properties:
    section_id:
      type: string
      description: Section identifier — becomes the __designbook.section tag value on every generated record
    bundle:
      $ref: ../schemas.yml#/BundleRef
    sample_data_bundles:
      type: array
      description: The entity_type+bundle pairs to generate, supplied by intake (rendered entities + their reference targets). The source the each expansion iterates.
      items:
        $ref: ../schemas.yml#/BundleRef
    entities: { type: array, default: [] }
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      workflow: /debo-data-model
      type: object
    components_dir:
      path: $DESIGNBOOK_DIRS_COMPONENTS
      type: string
      description: Available components — required for canvas bundle generation (rule canvas.md)
result:
  type: object
  required: [sample-data]
  properties:
    sample-data:
      path: $DESIGNBOOK_DATA/data/{{ bundle.entity_type }}.{{ bundle.bundle }}.yml
      $ref: ../schemas.yml#/SampleDataBundle
      validators: [data]
each:
  bundle:
    expr: "sample_data_bundles"
    schema: { $ref: ../schemas.yml#/BundleRef }
---

# Sample Data

Generate sample-data records for one bundle — `{{ bundle.entity_type }}.{{ bundle.bundle }}` — tagged for section `{{ section_id }}`. One file per bundle; the engine fans out the `each` over every bundle in the data model. Idempotent: preserve records already tagged with this section, append only the shortfall.

## Required Record Count

Derive the count from the bundle's `view_modes` in the data model:

- **Non-full view modes** (listing, teaser, card, …): 6
- **Full view mode**, `layout-builder` or `canvas` template: at least 3 (preserve existing)
- **Full view mode**, other templates (e.g. `field-map`): 1
- **Config entity** (the bundle lives under `config:`): 1

Read the existing result file and count records whose `__designbook.section` equals `{{ section_id }}`; treat a missing file as 0. Generate only `required − existing`, appending. New record ids continue from the highest existing id, or start at `"1"`.

**Skip rule.** If the bundle declares `purpose: landing-page` AND `entities` is non-empty AND this bundle is absent from `entities`, produce an empty array.

## Result: sample-data

A bare record array (no `content:`/`config:` wrapper — the loader derives the namespace from the data model). Every record carries a `__designbook` block with `section: {{ section_id }}`. Scenes select records via JSONata, e.g. `select: "$['{{ section_id }}' in __designbook.section and id = '3'][0]"`.

## Field Value Generation

For each field, choose the value structure by precedence:

1. **Explicit `sample_template`** — field has `sample_template.template: <name>` in the data model → load rules matching `when: template: <name>`, apply `sample_template.settings` as context.
2. **`field_type` rule fallback** — a rule matches `when: field_type: <type>` → use its output structure.
3. **Plain string** — no template, no matching rule → realistic plain string value.

### Entity reference fields (content entities)

Reference fields (`type: reference`) store the target record's `id` as a **plain string**. Target bundles use ids `"1"`…`"6"`, so a reference points at one of those:

```yaml
shelter: shelter-1
category: cat-dogs
```

### Entity reference fields on config listing entities (rows)

Config listing bundles that aggregate content use the **object form**:

```yaml
rows:
  - type: entity
    entity_type: post
    bundle: article
    view_mode: teaser
    select: "$[0]"
```
