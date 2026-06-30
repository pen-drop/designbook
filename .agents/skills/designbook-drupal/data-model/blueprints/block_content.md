---
type: entity-type
name: block_content
priority: 10
trigger:
  domain: data-model
filter:
  backend: drupal
  extensions: layout_builder
---

# Entity Type: block_content

```yaml
entity_type: block_content
section: content
base_fields:
  info:
    type: string
    required: true
  status:
    type: boolean
    required: true
```

## Drupal Config Export Pattern

The concrete `.jsonata` is authored per config-name task against the prepare-fetched schema.
The pattern below describes the mapping intent for authoring that transform.

**Input:** `{ bundle, def: { fields: { <name>: { type, required?, multiple?, settings? } } } }`

**Output config-name units:**
- `block_content.type.<bundle>` — the bundle entity; keys include `id`, `label` (both from `bundle`), `description` (from `def.purpose`), `revision: false`
- `field.storage.block_content.<name>` — one per field, via the field-types serialization pattern
- `field.field.block_content.<bundle>.<name>` — one per field, via the field-types serialization pattern

All emitted units carry `langcode: "en"`, `status: true`, and a `dependencies` object.
Field configs are serialized using `$fieldToStorage` / `$fieldToInstance` — see `field-types.md` for the mapping.
