---
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

# Create View Mode

Creates a JSONata expression file that maps entity fields to a ComponentNode array for rendering in Storybook.

## Output

```
$DESIGNBOOK_DIST/view-modes/{{ entity_type }}.{{ bundle }}.{{ view_mode }}.jsonata
```

## Format

Each `.jsonata` file is self-contained with an embedded config block:

```jsonata
/**
 * @config {
 *   "input": "./data-model.yml",
 *   "entity_type": "{{ entity_type }}",
 *   "bundle": "{{ bundle }}",
 *   "view_mode": "{{ view_mode }}"
 * }
 */
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
