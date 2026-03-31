---
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
---

# Intake: CSS Generate

Check whether CSS regeneration is needed and confirm with the user.

## Step 1: Check Regeneration

Check if generated CSS token files (location determined by the active CSS framework skill) are newer than `$DESIGNBOOK_DATA/design-system/design-tokens.yml`.

**If up to date:**

> "CSS token files are already up to date. Force regeneration anyway? (y/n)"

If no → stop (skip workflow creation).
If yes → proceed.

**If outdated or missing:** proceed automatically to the `generate-jsonata` and `generate-css` stages.

## Step 2: Detect Theme Files

Scan `$DESIGNBOOK_DATA/design-system/themes/` for `.yml` files. If theme files exist, include them in the generation plan — each theme file produces an additional JSONata expression and CSS output alongside the base color generation.

Theme files are color-only overrides; they generate `[data-theme="..."]` blocks (or framework-equivalent) instead of `@theme` blocks.

> CSS framework naming and expression format is determined automatically via task files discovered for each stage.
