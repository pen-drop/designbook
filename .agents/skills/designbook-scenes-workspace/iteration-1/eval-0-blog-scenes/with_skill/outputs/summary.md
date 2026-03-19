# Blog Scenes — Approach Summary

## Task

Create `sections/blog/blog.section.scenes.yml` with two scenes: Blog Detail and Blog Listing.

## Approach

1. **Read the skill** (`SKILL.md`) to understand the entity rendering stage routing table. Since `node.article` has `composition: structured` and the Blog Detail uses `view_mode: full`, it routes to `map-entity` — meaning the scene references the entity directly without inline component composition.

2. **Blog Detail scene** — uses `entity: node.article` with `view_mode: full` and `record: 0`. This is a single-entity detail page. The entity rendering is handled by a separate JSONata file (`view-modes/node.article.full.jsonata`) which would map `title` → `heading`, `field_body` → `text-block`, and `field_image` (media.image reference) → `figure` component. The scene itself only needs to declare the entity ref.

3. **Blog Listing scene** — uses `entity: view.recent_articles` with `view_mode: default`. Per the skill's entry-types and view-entity rules, listing pages must use a view entity (never `records: []` shorthand). A heading component is added above it for the page title.

4. **Shell inheritance** — both scenes use `type: scene` + `ref: design-system:shell` with a `with: content:` block. This avoids duplicating header/footer across scenes.

5. **Provider prefix** — all `component:` values use the `my_drupal_theme:` prefix as specified by the task (provider is `my_drupal_theme`).

## Key Rules Applied

- No `type: element` in scenes (used plain string for heading text slot)
- Provider prefix on every component reference
- View entity for listing, single entity + record for detail
- Section metadata fields (`id`, `title`, `description`, `status`, `order`) all present
