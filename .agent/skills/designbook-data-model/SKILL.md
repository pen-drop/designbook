---
name: designbook-data-model
description: Validates and stores data model configuration in YAML format. Includes entity display mappings (view_modes) with $field_name resolution and nested entity refs.
---

# Designbook Data Model Skill

This skill is the central authority for validating and saving the data model to the project. It validates the data model YAML against the bundled schema using `ajv-cli` and persists it to `designbook/data-model.yml`.

## Schema

The schema is bundled with this skill at `schema/data-model.schema.yml`. This is the single source of truth for validation.

### Schema structure

```
content (required)
  └── {entity_type}          # e.g. node, block_content, media, taxonomy
        └── {bundle}          # e.g. article, page
              ├── fields
              │     └── {field_name}
              │           ├── type (required)  # string, text, integer, boolean, reference, ...
              │           ├── title
              │           ├── description
              │           ├── required
              │           ├── multiple
              │           ├── default
              │           └── settings
              └── view_modes
                    └── {mode_name}   # e.g. full, teaser
                          └── mapping[]   # ordered list of component entries

config (optional)
  └── views
        └── {view_name}
              ├── base_entity (required)
              ├── bundle (required)
              ├── sorting
              ├── limit
              ├── hasPager
              └── hint
```

## View Mode Mappings

Each bundle can define `view_modes` with an ordered `mapping[]` array that maps entity fields to UI components. The `storybook-addon-designbook` Vite plugin resolves `type: entity` screen entries at build time — resolving mappings and sample data into rendered components.

### Mapping Entry Structure

| Key | Required | Description |
|-----|----------|-------------|
| `component` | ✅ | Component name (without provider prefix — added at render time) |
| `props` | ❌ | Data/config values. `$field_name` = resolved from entity data. Other values = static |
| `slots` | ❌ | Rendered content. `$field_name` strings, nested component arrays, or `{type: entity}` refs |

### `$field_name` Syntax

String values prefixed with `$` are resolved against the entity record in `data.yml`:

| Syntax | Resolves to |
|--------|-------------|
| `$title` | `data["node"]["article"][record]["title"]` |
| `$field_media.url` | `data["node"]["article"][record]["field_media"]["url"]` |
| `true`, `"h1"` | Static value (no `$` prefix = pass through) |

### Nested Entity References in Slots

Slot values can be `{type: entity}` objects for cross-entity rendering. These are resolved recursively:

```yaml
view_modes:
  full:
    mapping:
      - component: heading
        props: { level: h1 }
        slots: { text: $title }
      - component: contact-card
        slots:
          avatar:
            type: entity
            entity_type: block_content
            bundle: contact_person
            view_mode: avatar
            record: 0
```

The referenced entity must also have a `view_modes` entry with its own `mapping[]`.

### Field-to-Component Mapping Guide

| Field Type | Suggested Component | Props/Slots |
|------------|-------------------|-------------|
| `string` (title) | `heading` | slots: `{text: $title}`, props: `{level: h1}` |
| `text` / `text_long` | `text-block` | slots: `{content: $field_body}` |
| `reference` (media) | `figure` | props: `{src: $field_media.url, alt: $field_media.alt}` |
| `reference` (taxonomy) | `badge` | slots: `{label: $field_category.name}` |
| `datetime` | `date-display` | props: `{date: $field_date}` |
| `link` | `button` or `link` | props: `{url: $field_link.url}`, slots: `{label: $field_link.title}` |

## Dependencies

- **ajv-cli** — used via `npx ajv-cli`

## Validation

Validate a data model file against the schema:

```bash
npx ajv-cli validate \
  -s .agent/skills/designbook-data-model/schema/data-model.schema.yml \
  -d <path-to-data-model.yml>
```

## Steps

- [process-data-model](./steps/process-data-model.md): Validates and saves data model configuration.

