---
trigger:
  domain: sample-data
---

# Field Values

Hard constraints for generating field values in sample data files (`data.yml`, `*.demo.yml`).

## Output Format

`data.yml` and demo files MUST use `content:` and `config:` as top-level section keys — mirroring the data model structure:

```yaml
content:
  {entity_type}:       # e.g. node, media, taxonomy_term, canvas_page
    {bundle}:          # e.g. article, image, tags, landing_page
      - id: "1"
        {field}: {value}

config:
  {entity_type}:       # e.g. view
    {bundle}:
      - id: "1"
        {field}: {value}
```

- Content entities from the data model `content:` section → write under `content:`
- Config entities from the data model `config:` section → write under `config:`
- Omit `config:` entirely if there are no config entities

## Field Value Generation

For each field in a record, determine value structure using this precedence:

1. **Explicit `sample_template`** — field has `sample_template.template: <name>` in the data model
   → Load rules matching `when: template: <name>`
   → Apply `sample_template.settings` as context

2. **`field_type` rule fallback** — a rule matches `when: field_type: <type>`
   → Load that rule and use its output structure

3. **Plain string** — no template, no matching rule → realistic plain string value

### Entity reference fields (content entities)

Reference fields (`type: reference`) on `content:` entities store the target record's `id` as a **plain string**:

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
    record: 0
```

## Idempotent Append

Read the existing target file before writing. Preserve all existing records. Append only records that are missing. New record ids continue from the highest existing id (or start at "1" if no records exist).

## Validation

Check against the data model before writing.

### Hard Errors (stop — fix before writing)

1. **Missing entity type** — top-level key not in the data model
2. **Missing bundle** — second-level key not in the data model

### Warnings (continue but report)

1. **Unknown field** — field not defined in the data model for this bundle
2. **Missing required field** — `required: true` field absent from a record
3. **Broken reference** — reference field value doesn't match any `id` in the target bundle's records
