# Approach Summary: node.article.teaser JSONata Mapping (without skill)

## Task

Generate a JSONata view mode mapping for `node.article.teaser` with provider `my_drupal_theme`.

## Approach

Rather than using a skill, I explored the codebase directly to understand the conventions:

1. **Read existing `.jsonata` fixtures** in `packages/storybook-addon-designbook/src/renderer/__tests__/fixtures/view-modes/` to understand the ComponentNode array format, conditional rendering with ternaries, and dot-notation for nested reference fields.
2. **Read skill resource files** in `.agents/skills/designbook-scenes/resources/` — specifically `field-mapping.md` (field type → component table), `jsonata-reference.md` (ComponentNode structure and JSONata syntax), and `entry-types.md` — to confirm conventions for provider prefixes, conditional guards, and reference field access.
3. **Observed provider prefix pattern** from `node.article.card.jsonata`, which uses `test_provider:card` style, confirming that `my_drupal_theme:` must prefix every component name.

## Field Mapping Decisions

| Field | Type | Component | Notes |
|-------|------|-----------|-------|
| `title` | string | `my_drupal_theme:heading` | Teaser uses `h3` (not `h1`) for visual hierarchy |
| `field_body` | text | `my_drupal_theme:text-block` | Conditional — only rendered if present |
| `field_image` | reference → media.image | `my_drupal_theme:figure` | Conditional; `alt` falls back to `title` if absent |
| `field_category` | reference → taxonomy_term.category | `my_drupal_theme:badge` | Conditional — only rendered if present |

## Key Decisions

- **Provider prefix**: `my_drupal_theme:` applied to all component names, matching the established `<provider>:<component>` naming convention.
- **Reference fields as inline props**: `field_image` and `field_category` are accessed via dot notation (`field_image.url`, `field_image.alt`, `field_category.name`) — the task specification provides the sub-properties directly, and teaser view modes inline media/taxonomy data rather than recursing into separate entity renders.
- **Conditional rendering**: `field_image`, `field_category`, and `field_body` are wrapped in ternary guards so absent fields yield `null`, which JSONata automatically filters from arrays.
- **Visual ordering**: Image first (draws attention), category badge second (context), heading third (identity), body last (detail) — standard teaser card hierarchy.
- **`title` is unconditional**: The title is a required string field and always present; no conditional guard needed.
