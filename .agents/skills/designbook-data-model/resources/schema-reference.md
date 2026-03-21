# Data Model Schema Reference

The schema is bundled in the addon package at `packages/storybook-addon-designbook/dist/schemas/data-model.schema.yml`.

## Structure

```
content (required)
  └── {entity_type}          # e.g. node, block_content, media, taxonomy_term
        └── {bundle}          # e.g. article, landing_page
              ├── title
              ├── description
              ├── view_modes   # optional: map of view_mode_name → { template, settings }
              └── fields
                    └── {field_name}
                          ├── type (required)  # string, text, integer, boolean, reference, ...
                          ├── title
                          ├── description
                          ├── required
                          ├── multiple
                          ├── default
                          ├── settings
                          └── sample_template  # optional: { template, settings: { hint } }

config (optional)
  └── {entity_type}          # e.g. view (Drupal views), singletons
        └── {bundle}          # e.g. recent_articles
              ├── view_modes   # same structure as content bundles
              └── fields
```

## `view_modes`

Declares per-view-mode template mapping for a bundle. Each entry maps a view mode name to a template:

```yaml
node:
  landing_page:
    view_modes:
      full:
        template: layout-builder
```

Available templates are declared in `designbook.config.yml` under `entity_mapping.templates`. Each template maps to a rule file in `skills/*/rules/` with `when: template: {name}`.

## `sample_template` on fields

Fields may declare a `sample_template` to guide sample data generation:

```yaml
field_body:
  type: text_with_summary
  sample_template:
    template: formatted-text
    settings:
      hint: "Technical article body"
```

## Config Entities

`config` follows the same `entity_type → bundle → view_modes/fields` structure as `content`. Use it for configuration entities (e.g. Drupal Views, singletons). Config entities are rendered like any other entity: `view_modes.<mode>.template` determines the JSONata rule loaded during `map-entity`.

Backend-specific config entity guidance (e.g. Drupal `view` entity type) is documented in the backend data model skill.
