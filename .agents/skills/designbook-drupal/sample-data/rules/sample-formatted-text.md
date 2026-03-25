---
when:
  stages: [create-sample-data]
  backend: drupal
  template: formatted-text
---

# Sample Template: formatted-text

Applies when a field has `sample_template.template: formatted-text`, or when `field_type` matching is active for `formatted_text` / `text_with_summary` / `text_long`.

## Output Structure

Generate simple markup:

```yaml
body: "<p>First paragraph content.</p><p>Second paragraph with <strong>emphasis</strong>.</p>"
```


