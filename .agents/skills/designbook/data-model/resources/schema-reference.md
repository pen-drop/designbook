# Data Model Schema Reference

The schema is bundled in the addon package at `packages/storybook-addon-designbook/dist/schemas/data-model.schema.yml`.

## Structure

```
content (required)
  └── {entity_type}          # e.g. post, asset, category
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
  └── {entity_type}          # e.g. listing, singleton
        └── {bundle}          # e.g. recent_articles, user_login
              ├── view_modes   # same structure as content bundles
              └── fields
```

## `view_modes`

Declares per-view-mode template mapping for a bundle. Each entry maps a view mode name to a template:

```yaml
post:
  landing_page:
    view_modes:
      full:
        template: layout-builder
```

Available templates are declared in `designbook.config.yml` under `entity_mapping.templates`. Each template maps to a rule file in `skills/*/rules/` with `when: template: {name}`.

## `sample_template` on fields

Fields may declare a `sample_template` to guide sample data generation:

```yaml
body:
  type: text
  sample_template:
    template: formatted-text
    settings:
      hint: "Technical article body"
```

## Config Entities

`config` follows the same `entity_type → bundle �� view_modes/fields` structure as `content`. Use it for configuration entities (listings, singletons, etc.). Config entities are rendered like any other entity: `view_modes.<mode>.template` determines the JSONata rule loaded during `map-entity`.

Backend-specific config entity guidance is documented in the backend data model skill.

### image_style

`image_style` is a built-in config entity type with a different bundle structure — bundles use `aspect_ratio` and `breakpoints` directly instead of `fields`:

```yaml
config:
  image_style:
    hero:
      aspect_ratio: 21:9
      breakpoints:
        xl: { width: 1200 }
        md: { width: 768, aspect_ratio: 16:9 }
        sm: { width: 480, aspect_ratio: 4:3 }
    card:
      aspect_ratio: 4:3
    avatar:
      aspect_ratio: 1:1
```

Image styles are referenced in scenes via `type: image` nodes (not `entity:` nodes). See [scenes-schema](../../design/resources/scenes-schema.md) for the `ImageNode` definition.
