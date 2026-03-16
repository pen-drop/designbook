## Why

Designbook currently has no concept of how page content is composed in the backend. In Drupal (and other CMS), there are fundamentally three composition patterns:

1. **Structured**: Entities reference other entities via fields (e.g., `node.article` → `field_author` → `user.user`). Classic Drupal content types.
2. **Layout Builder**: Entities have a layout with sections that contain block/paragraph entities (e.g., `node.landing_page` → sections → `block_content.hero`). The section component provides container + grid, columns reference entities.
3. **Component Tree**: Entities have a flat component tree managed by Canvas, Display Builder, or Experience Builder. Components render directly without an intermediate entity layer.

These patterns determine:
- How view mode JSONata expressions are structured
- Whether nested entity references need recursive resolution
- What sample data looks like
- What questions the skills ask during workflows

Today, all three patterns collapse into a single flat pipeline (entity → JSONata → Component[]), which cannot represent nested entity references or section-based layouts.

## What Changes

### 1. Config: `extensions` (top-level, backend-agnostic)

Add an `extensions` array to `designbook.config.yml` that declares backend capabilities affecting content composition:

```yaml
backend: drupal
extensions:
  - layout_builder
frameworks:
  component: sdc
  css: daisyui
```

Extensions are backend-agnostic — any backend can declare extensions:
- Drupal: `layout_builder`, `canvas`, `experience_builder`, `paragraphs`
- WordPress: `gutenberg`
- Craft CMS: `matrix`

Exposed as `DESIGNBOOK_EXTENSIONS` (comma-separated).

### 2. Data Model: `composition` per bundle

Add `composition: structured | unstructured` to each bundle in `data-model.yml`. `unstructured` only affects view_mode `full` — all other view modes (teaser, card, etc.) are always structured and use the bundle's fields normally.

```yaml
content:
  node:
    article:
      # composition: structured    ← default, can be omitted
      fields:
        title: { type: string, required: true }
        field_author:
          type: reference
          settings: { target_type: user, target_bundle: user }

    landing_page:
      composition: unstructured    # only view_mode: full uses extension
      fields:
        title: { type: string, required: true }
        field_image:               # still needed for teaser/card view modes
          type: reference
          settings: { target_type: media, target_bundle: image }
        field_summary: { type: text }

  block_content:
    hero:
      # structured — blocks always have normal fields
      fields:
        field_headline: { type: string }
        field_image:
          type: reference
          settings: { target_type: media, target_bundle: image }
```

### 3. Renderer: Recursive entity resolution

The scene-module-builder must resolve `type: "entity"` nodes recursively — in JSONata output and in component slots. This is the single renderer change that enables all three patterns.

### How composition + extension combine

| composition   | extension        | Pipeline                                     |
|---------------|------------------|----------------------------------------------|
| structured    | (any)            | entity → JSONata → Component[] (may contain nested entity refs → recursive) |
| unstructured  | layout_builder   | entity → JSONata → Section-Component[] → slots contain entity refs → recursive |
| unstructured  | canvas / exp.b.  | entity → JSONata → Component[] (direct, no nesting) |
| unstructured  | (none)           | entity → JSONata → Component[] (direct)      |

## Capabilities

### New Capabilities

- `extensions-config`: Top-level `extensions` array in `designbook.config.yml` with env variable `DESIGNBOOK_EXTENSIONS`
- `bundle-composition`: Per-bundle `composition: structured | unstructured` field in data model schema
- `recursive-entity-resolution`: Renderer resolves `type: "entity"` nodes recursively in JSONata output and component slots

### Modified Capabilities

- `data-model-schema`: Add `composition` field to bundle schema (default: `structured`)
- `scene-module-builder`: Support recursive entity resolution in render pipeline
- `designbook-view-modes`: JSONata expressions may output `type: "entity"` nodes for nested references
- `designbook-sample-data`: Generate appropriate sample data based on composition + extension

## Impact

- **Config schema**: New `extensions` key, new env variable
- **Data model schema**: New `composition` field per bundle (backward-compatible, defaults to `structured`)
- **Renderer**: Recursive resolution — biggest code change
- **Skills**: `debo-data-model`, `debo-shape-section`, `debo-sample-data`, `designbook-view-modes`, `designbook-scenes` must read composition + extensions to generate appropriate artifacts
- **Existing projects**: No breaking changes — missing `extensions` = empty, missing `composition` = `structured`
