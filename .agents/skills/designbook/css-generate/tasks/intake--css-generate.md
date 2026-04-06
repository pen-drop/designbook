---
when:
  steps: [css-generate:intake]
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

**If outdated or missing:** intake is complete — regeneration needed.

> CSS framework naming and expression format is determined automatically via task files discovered for each stage.
