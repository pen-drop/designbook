# Cooks Delight — WordPress

Same recipe demo as [drupal-recipe](../drupal-recipe/README.md), on `backend: wordpress`
(`frameworks.component: twig`). The layers `empty`, `reference` and `vision` are copies of the
drupal-recipe layers; they are backend-independent. Later layers (`data-model`, `tokens`,
`screen`) are snapshots of this suite's own case results.

The recipe is `post.recipe` (custom post type) with ACF fields; ingredients and steps are
repeaters, timing is `prep_minutes + cook_minutes`. Sync cases need the DDEV WordPress site:
`scripts/start-wordpress-workspace.sh --workspace <dir>` (admin `admin` / `admin`).
