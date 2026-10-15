---
type: entity-type
name: attachment
priority: 10
trigger:
  domain: data-model
filter:
  backend: wordpress
---

# Entity Type: attachment

Media library items. WordPress ships the `attachment` post type, so a bundle needs no
registration; bundle `image` covers images. Image sizes come from the theme, not from the
data model.

```yaml
entity_type: attachment
section: content
base_fields:
  title:
    type: text
    required: false
  alt:
    type: text
    required: false
  caption:
    type: textarea
    required: false
```

## Sync units

- `field_group.attachment_<bundle>` — an ACF field group, only when the bundle has non-base fields
