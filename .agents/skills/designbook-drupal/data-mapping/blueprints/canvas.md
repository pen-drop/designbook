---
type: data-mapping
name: canvas
priority: 10
when:
  steps: [map-entity]
---

# Rule: Canvas — Passthrough Mapping

Applies when `map-entity` runs for a view mode with `template: canvas` (i.e. a `canvas_page` bundle's full view mode).

## Behavior

For Canvas full view mode, the sample data IS the component tree — no JSONata field mapping is needed. The `component_tree` field on the `canvas_page` record contains a nested component tree stored directly inline. No entity references, no block_content — all component data is self-contained.

## JSONata Pattern

```jsonata
(
  $record := $;
  $record.components
)
```

## Structure of `components`

The `components` field contains a nested `ComponentNode[]`. Each top-level entry is a **section** component (e.g. `canvas_section`). Sections have `children` arrays of `canvas_*` components with inline `props`.

Example structure in sample data:
```yaml
components:
  - component: "COMPONENT_NAMESPACE:canvas_section"
    props:
      layout: full-width
    children:
      - component: "COMPONENT_NAMESPACE:canvas_text"
        props:
          text: "Welcome to our site"
      - component: canvas_image
        props:
          src: "/path/to/image.jpg"
          alt: "Hero image"
      - component: "COMPONENT_NAMESPACE:canvas_cta"
        props:
          label: "Get started"
          href: "/contact"
```

## Rules

- Read the `components` field directly from the sample data record — this IS the component tree
- Do NOT generate a field-by-field JSONata mapping — just return `$record.components`
- There are NO entity references in Canvas — all component data is inline
- Canvas uses the entity type `canvas_page` (not `node`)
- `canvas_*` child components carry their own `props` inline — no further resolution needed
- Sections can have multiple levels of nesting (unlike Layout Builder which is flat)
