---
trigger:
  steps: [create-sample-data]
filter:
  backend: drupal
---

# Sample Template: link

Applies when a when `field_type` matching is active for `link`.

## Output Structure

Generate structured link data. Do not generate HTML anchor strings; entity mappings and
components need machine-readable labels and URLs to choose the reference-visible treatment.

```yaml
field_cta:
  title: "Learn More"
  url: "https://example.com/page"
```

Multi-value link fields are arrays of the same object shape:

```yaml
field_links:
  - title: "Learn More"
    url: "https://example.com/page"
```
