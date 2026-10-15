---
type: entity-type
name: term
priority: 10
trigger:
  domain: data-model
filter:
  backend: wordpress
---

# Entity Type: term

Bundles are taxonomies, registered with `register_taxonomy()` and attached to the post types
that reference them through a `taxonomy` field.

```yaml
entity_type: term
section: content
base_fields:
  name:
    type: text
    required: true
  description:
    type: textarea
    required: false
```

## Sync units

- `taxonomy.<bundle>` — the taxonomy registration
- `field_group.term_<bundle>` — an ACF field group, only when the bundle has non-base fields
