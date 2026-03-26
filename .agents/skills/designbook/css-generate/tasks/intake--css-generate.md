---
files: []
reads:
  - path: $DESIGNBOOK_DIST/design-system/design-tokens.yml
---

# Intake: CSS Generate

Check whether CSS regeneration is needed and confirm with the user.

## Step 1: Check Regeneration

Check if CSS files in `$DESIGNBOOK_DRUPAL_THEME/css/tokens/` are newer than `$DESIGNBOOK_DIST/design-system/design-tokens.yml`.

**If up to date:**

> "CSS token files are already up to date. Force regeneration anyway? (y/n)"

If no → stop (skip workflow creation).
If yes → proceed.

**If outdated or missing:** proceed automatically to the `generate-jsonata` and `generate-css` stages.

> CSS framework naming and expression format is determined automatically via task files discovered for each stage.
