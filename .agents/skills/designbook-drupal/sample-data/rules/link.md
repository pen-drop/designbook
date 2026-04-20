---
trigger:
  steps: [create-sample-data]
filter:
  backend: drupal
---

# Sample Template: link

Applies when a when `field_type` matching is active for `link`.

## Output Structure

Generate an HTML anchor string:

```yaml
field_cta: "<a href=\"https://example.com/page\">Learn More</a>"
```

