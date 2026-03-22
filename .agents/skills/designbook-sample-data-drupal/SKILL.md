---
name: designbook-sample-data-drupal
description: Drupal-specific field sample data templates. Load this skill when DESIGNBOOK_BACKEND is drupal.
---

# Designbook Sample Data — Drupal

Drupal-specific template rules for the `create-sample-data` stage. Loaded automatically alongside `designbook-sample-data` when `DESIGNBOOK_BACKEND=drupal`.

## Recommended Config

Add to `designbook.config.yml` to enable auto-assignment during data model creation:

```yaml
sample_data:
  field_types:
    formatted_text: formatted-text
    text_with_summary: formatted-text
    text_long: formatted-text
    link: link
    image: image
```
