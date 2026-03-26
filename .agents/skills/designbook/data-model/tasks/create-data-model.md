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
      view_modes:
        {view_mode}:      # e.g. default, full
          template: ~     # required: template name from entity_mapping.templates in config
          settings: {}    # optional: template-specific settings
      fields:

content:
  {entity_type}:        # e.g. node, media, taxonomy_term
    {bundle}:           # e.g. article, landing_page
      title: ~
      description: ~
      view_modes:
        {view_mode}:    # e.g. teaser, full, card
          template: ~   # required: template name from entity_mapping.templates in config
          settings: {}  # optional: template-specific settings
      fields:
        {field_name}:
          type: ~        # required: string, text, integer, boolean, reference, ...
          title: ~
          description: ~
          required: false
          multiple: false

```

## `view_modes` and `template`

Each view mode declares a `template` that determines how the entity is mapped to components. Read available templates from `entity_mapping.templates` in `designbook.config.yml` — each has a `description` to explain its purpose.

Common templates:
- `field-map` — structured field mapping, entity fields drive component selection

During the dialog, present available templates with descriptions and ask the author which template applies to each view mode.

> Backend-specific naming rules are loaded automatically via rule files.
