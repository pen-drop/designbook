---
type: data-mapping
name: canvas
priority: 10
trigger:
  domain: data-mapping
---

# Blueprint: Canvas — Passthrough Mapping

Starting point for `map-entity` on a `canvas_page` bundle's full view mode (`template: canvas`). The page's composition is the sample tree in its `component_tree` field `components`, so the mapping passes that field through: no wrapping component, no field bindings, no entity references.

## JSONata Pattern

```jsonata
(
  $record := $;
  $record.components
)
```

## Example sample tree

The mapping above returns this tree unchanged, nested sections and all:

```yaml
components:
  - component: "$COMPONENT_NAMESPACE:section"
    props:
      max_width: "lg"
    slots:
      column_1:
        - component: "$COMPONENT_NAMESPACE:hero"
          slots:
            content:
              - component: "$COMPONENT_NAMESPACE:rich-snippet"
                props:
                  headline: "Welcome to our site"
```

## Config expansion (sync-to Scene sync)

Starting point for the config unit `sync-to` emits when a Scene's page uses
`build_form: canvas`. A Scene resolves to **config only** — never a `canvas_page` content
entity, never a content payload, never a backend content step:

- **Page layout config** — a single `page_layout` config entity carrying the Scene's component
  tree inline as its `components` field, exactly the nested `ComponentNode[]` shown above. It
  has its own route/URL; the visible content lives inline in this config, self-contained with
  no entity references.

Canvas emits only this one config unit. This is an overridable starting point — a project whose
Display-Builder page config differs replaces it.
