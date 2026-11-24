---
type: entity-type
name: post
priority: 10
trigger:
  domain: data-model
filter:
  backend: wordpress
---

# Entity Type: post

Bundles are post types: custom post types plus the built-in `post` and `page`. A custom
bundle is registered with `register_post_type()`; its fields become one ACF field group.

```yaml
entity_type: post
section: content
base_fields:
  title:
    type: text
    required: true
  content:
    type: wysiwyg
    required: false
  excerpt:
    type: textarea
    required: false
  featured_image:
    type: image
    required: false
  author:
    type: relationship
    required: false
    settings:
      target: user
```

Base fields are native post properties (`post_title`, `post_content`, `post_excerpt`,
`_thumbnail_id`, `post_author`), not ACF fields. Declare those a mapping consumes under the
bundle's `fields` like any other field.

## Sync units

- `post_type.<bundle>` — the post type registration (skipped for built-in `post`/`page`)
- `field_group.post_<bundle>` — one ACF field group holding every non-base field
