---
type: data-mapping
name: canvas
priority: 10
when:
  steps: [map-entity]
---

# Blueprint: Canvas — Passthrough Mapping

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

The `components` field contains a nested `ComponentNode[]`. Each top-level entry is typically a **section** component. Sections use `slots` for nested content, with each slot containing either plain strings or arrays of nested `ComponentNode`.

Example structure in sample data:
```yaml
components:
  - component: "$COMPONENT_NAMESPACE:section"
    props:
      max_width: "lg"
      padding_top: "lg"
      columns: 1
    slots:
      column_1:
        - component: "$COMPONENT_NAMESPACE:hero"
          slots:
            content:
              - component: "$COMPONENT_NAMESPACE:rich-snippet"
                props:
                  headline: "Welcome to our site"
                  headline_level: "h1"
                  text: "Get started with our platform."
            actions:
              - component: "$COMPONENT_NAMESPACE:button"
                props:
                  variant: "primary"
                  content: "Get started"
```

## Rules

- Read the `components` field directly from the sample data record — this IS the component tree
- Do NOT generate a field-by-field JSONata mapping — just return `$record.components`
- There are NO entity references in Canvas — all component data is inline
- Canvas uses the entity type `canvas_page` (not `node`)
- Nested components carry their own `props` and `slots` inline — no further resolution needed
- Sections can have multiple levels of nesting (unlike Layout Builder which is flat)
