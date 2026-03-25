---
when:
  extensions: canvas
  stages: [designbook-data-model:intake, create-data-model]
---

# Rule: Canvas Extension

Applies when the Canvas module is active. Canvas manages pages through a visual component editor stored directly on the entity — no block_content indirection.

## Entity Type

Canvas pages use the `canvas_page` entity type (provided by the Canvas module), not `node`. In `data-model.yml` these appear under `content.canvas_page.<bundle>`.

```yaml
content:
  canvas_page:
    page:
      title: Page
      description: Canvas-managed landing page
      fields:
        title:
          type: string
          title: Title
        components:
          type: component_tree
          title: Component Tree
          sample_template: 
            template: "canvas"
      view_modes:
        full:
          template: canvas
        teaser:
          template: field-map
```

## Rules

- Use `canvas_page` as the entity type — do NOT use `node` for Canvas-managed pages
- The `components` field stores the inline component tree — it is the single content field on a Canvas page
- The `sample_template.template` must be set to `canvas`
- Do NOT suggest `block_content` for Canvas pages — components are stored inline in `component_tree`, not as separate entities
- Set `view_modes.full.template: canvas` on all `canvas_page` bundles
- All non-full view modes (teaser, card, listing) MUST use `template: field-map`
- The `component_tree` field type does not need a `field_` prefix — it is a base field provided by the module
