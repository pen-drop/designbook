---
params:
  content: {}
files:
  - $DESIGNBOOK_DIST/data-model.yml
---

# Create Data Model

Writes the approved data model to `$DESIGNBOOK_DIST/data-model.yml` in YAML format.

## Output

```
$DESIGNBOOK_DIST/data-model.yml
```

## Format

```yaml
config:                   # optional — configuration entities (views, singletons)
  {entity_type}:          # e.g. view, block_content
    {bundle}:             # e.g. recent_articles, sidebar
      composition: unstructured   # usually unstructured; same options as content

content:
  {entity_type}:        # e.g. node, media, taxonomy_term
    {bundle}:           # e.g. article, landing_page
      title: ~
      description: ~
      composition: structured   # optional: "structured" (default) | "unstructured"
      fields:
        {field_name}:
          type: ~        # required: string, text, integer, boolean, reference, ...
          title: ~
          description: ~
          required: false
          multiple: false

```

## `composition` Values

- `structured` (default) — all view modes render from fields
- `unstructured` — full view mode uses layout/component tree; other view modes still use fields

> Backend-specific naming rules (e.g. Drupal `field_` prefix) are loaded automatically via rule files.
