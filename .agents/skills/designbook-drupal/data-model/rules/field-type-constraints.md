---
trigger:
  domain: data-model
filter:
  backend: drupal
---

# Rule: Drupal Field Type Constraints

`DataModel.content.*.*.fields.*.type` must be one of the nine types that the
`field-types` blueprint serializes to Drupal config. Any other value has no
`$fieldToStorage` / `$fieldToInstance` mapping and will cause the export stage
to fail.

## Merge engine limitation

The `constrains:` mechanism intersects enum values by navigating named
`properties` paths.  `DataModel.content` uses `additionalProperties` wildcards
at the entity-type and bundle levels, not named `properties` keys.  Because the
merge engine cannot recurse through `additionalProperties`, there is no
`properties`-only path to `content.*.*.fields.*.type`.  The enum constraint
therefore cannot be expressed in `constrains:` frontmatter and is enforced here
as guidance.  If the merge engine gains `additionalProperties`-aware descent in
a future release, migrate the constraint below into `constrains:` frontmatter
and remove this prose.

## Enforced field type enum

`fields.*.type` must be one of:

| Value | Drupal storage type | Module |
|---|---|---|
| `string` | `string` | `text` |
| `text` | `text_long` | `text` |
| `text_with_summary` | `text_with_summary` | `text` |
| `formatted_text` | `text_long` | `text` |
| `integer` | `integer` | `core` |
| `boolean` | `boolean` | `core` |
| `link` | `link` | `link` |
| `image` | `image` | `image` |
| `reference` | `entity_reference` | `core` |

Any other value is invalid for the Drupal backend and must be rejected.

## Per-type required settings

These requirements also cannot be expressed via `constrains:` (no `if/then/else`
conditional support in the merge engine).  They are hard constraints enforced
here as guidance:

- **`image`** — `settings.image_style` is **required**.  Without it the storage
  config omits the style and Drupal falls back to the `_original` style
  silently.
- **`reference`** — `settings.target_type` is **required**.  Without it the
  `entity_reference` storage record has no `target_type` and Drupal config
  import fails.

All other field types accept an empty or absent `settings` object.
