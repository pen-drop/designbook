# Approach Summary: node.article.teaser JSONata Mapping

## Task

Generate a JSONata view mode mapping for `node.article.teaser` with provider `my_drupal_theme`.

## Skill Resources Used

- `SKILL.md` — identified `map-entity` as the correct stage for non-full view modes
- `tasks/map-entity.md` — output format, file naming convention, key rules
- `resources/jsonata-reference.md` — ComponentNode structure, conditional component pattern, JSONata syntax
- `resources/field-mapping.md` — field type to component mapping table

## Field Mapping Decisions

| Field | Type | Component | Notes |
|-------|------|-----------|-------|
| `title` | string | `my_drupal_theme:heading` | Teaser uses `h3` level (not `h1`) |
| `field_body` | text | `my_drupal_theme:text-block` | Conditional — only rendered if present |
| `field_image` | reference → media.image | `my_drupal_theme:figure` | Conditional; `alt` falls back to `title` if absent |
| `field_category` | reference → taxonomy_term.category | `my_drupal_theme:badge` | Conditional — only rendered if present |

## Key Decisions

- **Provider prefix**: `my_drupal_theme:` applied to all component names as required by the skill rules (never left as placeholder).
- **Reference fields as inline props**: `field_image` and `field_category` are resolved via dot notation (`field_image.url`, `field_image.alt`, `field_category.name`) rather than emitting `type: entity` nodes, because the task specifies the available sub-properties directly and teaser view modes typically inline media/taxonomy data rather than recursing into full entity renders.
- **Conditional rendering**: `field_image`, `field_category`, and `field_body` are wrapped in ternary guards so missing fields produce `null` (automatically filtered by JSONata).
- **Image ordering**: Image is placed first for visual hierarchy typical of teaser cards, followed by category badge, heading, then body text.
- **No `$fields` alias**: The expression uses direct field access (no `$fields :=` binding) consistent with the `jsonata-reference.md` examples for simpler expressions.
