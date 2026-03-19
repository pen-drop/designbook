# Approach Summary: view.recent_articles.default.jsonata

## Task

Create a JSONata view mode mapping for the view entity `view.recent_articles` in the `default` view mode. The output should render a listing of articles in `teaser` view mode inside a wrapper component `my_drupal_theme:article-list` with 3 article entity refs in the `items` slot.

## Approach

I explored the codebase to understand the JSONata view mode mapping format by reading:

1. Existing fixture files in `packages/storybook-addon-designbook/src/renderer/__tests__/fixtures/view-modes/` — specifically `view.recent_articles.default.jsonata` and `view.mixed_content.default.jsonata` to understand the view entity pattern.
2. The skill resource `view-entity.md` which documents the canonical structure for view entity JSONata files.
3. Other entity view mode files (`node.article.teaser.jsonata`, `node.article.with-author.jsonata`) to understand entity ref syntax.

## Key findings

- View entity JSONata files receive `{}` as input (no record data).
- The output is a single component node (not an array) with `"type": "component"`.
- Entity refs in slots use the shorthand `{ "entity": "node.article", "view_mode": "teaser", "record": N }` — resolved at render time by `resolveEntityRefs`.
- The wrapper component follows the namespaced pattern `<provider>:<component-name>`.

## Output structure

The resulting expression returns a single component node wrapping 3 article teaser entity refs (records 0, 1, 2) inside the `items` slot of `my_drupal_theme:article-list`.

## Difficulty without the skill

Without the skill, I had to explore the codebase manually to find the existing fixture files and resource documentation. The key insight — that the input is always `{}` and entity refs are declared inline with `record` indices — was not immediately obvious from the task description alone and required reading multiple reference files to confirm.
