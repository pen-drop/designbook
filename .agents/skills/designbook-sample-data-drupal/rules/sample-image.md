---
when:
  stages: [create-sample-data]
  backend: drupal
  template: image
---

# Sample Template: image

Applies when a field has `sample_template.template: image`, or when `field_type` matching is active for `image`.

## Output Structure

Generate an object with `uri` and `alt` keys:

```yaml
field_hero_image: "<img src=\"public://hero-banner.jpg\"/>"
```

## Settings

| Key | Default | Description |
|-----|---------|-------------|
| `hint` | — | Context for the image subject and alt text (e.g. "product hero image"). |

