---
when:
  stages: [compose-entity]
  extensions: [layout_builder]
---

# Rule: Layout Builder Composition

Applies when composing a `composition: unstructured` entity with `view_mode: full` and Layout Builder active.

## Pattern

Layout Builder uses **sections** as layout containers. Each section has column slots that contain **block_content entity refs** — never direct component nodes.

```yaml
# In scenes.yml — entity node with inline components:
- entity: node.landing_page
  view_mode: full
  components:
    - component: provider:section
      props:
        columns: 2
        max_width: lg
      slots:
        column_1:
          - entity: block_content.hero
            view_mode: full
            record: 0
        column_2:
          - entity: block_content.card_group
            view_mode: full
            record: 0
```

## Rules

- Sections are components from the design system (e.g. `provider:section`, `provider:section-full-width`)
- Column slots contain only `block_content` entity refs — NEVER direct component nodes
- Each block entity ref resolves via `map-entity` (block_content bundles are always structured)
- `record: N` selects which sample data record to use from `data.yml → block_content.{bundle}`
- A landing page typically has 1–4 sections; keep it realistic
- No nesting sections inside sections
