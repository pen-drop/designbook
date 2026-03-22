---
when:
  stages: [create-sample-data]
  backend: drupal
  template: link
---

# Sample Template: link

Applies when a field has `sample_template.template: link`, or when `field_type` matching is active for `link`.

## Output Structure

Generate an object with `uri` and `title` keys:

```yaml
field_cta: "<a href=\"https://example.com/page\">Learn More</a>"
```

