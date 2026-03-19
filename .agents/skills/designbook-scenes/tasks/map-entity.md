---
stage: map-entity
params:
  entity_type: ~
  bundle: ~
  view_mode: ~
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
    workflow: debo-data-model
files:
  - $DESIGNBOOK_DIST/view-modes/{{ entity_type }}.{{ bundle }}.{{ view_mode }}.jsonata
---

# Map Entity

Creates a JSONata expression file that maps entity fields to a ComponentNode array for rendering in Storybook.

**Use this task when:**
- `view_mode != full` (always structured)
- `view_mode = full` AND `composition: structured` (or absent)

For `view_mode = full` AND `composition: unstructured`, use `compose-entity` instead.

## Output

```
$DESIGNBOOK_DIST/view-modes/{{ entity_type }}.{{ bundle }}.{{ view_mode }}.jsonata
```

## Format

Each `.jsonata` file maps entity fields to `ComponentNode[]`. Reference fields that point to other entities emit `type: entity` nodes — these are resolved recursively by calling `map-entity` again for the referenced entity + view_mode.

```jsonata
(
  /* JSONata expression that maps entity fields → ComponentNode[] */
  $fields := $;
  [
    {
      "component": "provider:heading",
      "props": { "level": "h1" },
      "slots": { "text": $fields.title }
    },
    {
      "component": "provider:text-block",
      "slots": { "content": $fields.field_body }
    },
    /* Reference field → entity node, resolved recursively */
    $fields.field_author ? {
      "type": "entity",
      "entity_type": "user",
      "bundle": "user",
      "view_mode": "avatar",
      "record": 0
    }
  ]
)
```

## Key Rules

- One file per `entity_type.bundle.view_mode` combination
- Output must be a JSONata array expression returning `ComponentNode[]`
- Reference fields use dot notation: `$fields.field_media.url`
- Static values (no `$`): `"h1"`, `true`, `42`
- Provider prefix must be resolved at generation time (never leave as placeholder)
- Recursive entity refs: emit `type: entity` node — `map-entity` will be called again for that entity
