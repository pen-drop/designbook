## entity-param-resolution

Entity-mapping stage auto-derives `entity_type`, `bundle`, and `view_mode` from scene content references when these params are not explicitly provided.

### Behavior

When the map-entity task receives null params:

1. Read the section's scene file (`*.section.scenes.yml`)
2. Find all `content` blocks with `entity` and `view_mode` fields
3. Parse each `entity` value by splitting on `.` → `(entity_type, bundle)`
4. Collect unique `(entity_type, bundle, view_mode)` tuples
5. Create one entity-mapping file per tuple

### Entity Reference Format

```yaml
# In scene file
items:
  - scene: "design-system:shell"
    content:
      entity: "canvas_page.home"    # → entity_type: canvas_page, bundle: home
      view_mode: "full"             # → view_mode: full
      record: 0
```

### Constraints

- Entity mapping is mandatory — the stage must never be skipped
- One `.jsonata` file per unique (entity_type, bundle, view_mode) combination
- The data-mapping blueprint matching the view mode's `template` field determines the JSONata pattern
- If no matching blueprint exists, the agent must stop and report the error (not skip)
