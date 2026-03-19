# Approach Summary

## What I did

I explored the existing codebase to understand the scenes file format before writing output.

## Research

I read the following reference files from the skill resources:

- `entry-types.md` — describes the four entry types: `component`, `entity`, `view entity`, and `scene reference`
- `field-reference.md` — documents file-level and scene-level fields (`group`, `id`, `title`, `status`, `order`, `scenes[].name`, `scenes[].items`)
- `field-mapping.md` — maps Drupal field types to UI components
- `view-entity.md` — explains that listing pages use `entity: view.*` (not `records: [...]`)
- Existing scenes files in the test integration and fixtures for concrete syntax examples

## Decisions made

**Blog Detail scene:** Used `entity: node.article` with `view_mode: full` and `record: 0`. This is the standard pattern for a single-entity detail page wrapped in the design-system shell.

**Blog Listing scene:** Used `entity: view.blog_articles` with `view_mode: default`. Per `view-entity.md`, listing pages must use a view entity rather than the `records` shorthand (which is demo-only and not suitable for listing pages). A heading component was added above the listing to label the page. The view bundle name `blog_articles` follows the convention of naming it after the content type and section.

**Shell reference:** Both scenes use `type: scene` / `ref: design-system:shell` with `with: content:` to slot the page content into the layout shell — matching the pattern seen in `section.scenes.yml` fixtures.

**Provider:** The `my_drupal_theme` provider is used for the heading component in the listing scene, as specified.
