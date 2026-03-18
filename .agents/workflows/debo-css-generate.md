---
name: /debo-css-generate
id: debo-css-generate
category: Designbook
description: Generate CSS token files from design tokens. Automatically selects the correct skill based on DESIGNBOOK_FRAMEWORK_CSS.
workflow:
  title: Generate CSS
  stages: [generate-jsonata, generate-css]
reads:
  - path: ${DESIGNBOOK_DIST}/design-system/design-tokens.yml
    workflow: /debo-design-tokens
---

Generate CSS token files from W3C Design Tokens. Framework-specific `.jsonata` expression files are generated first, then executed to produce CSS output.

## Step 0: Load Workflow Tracking

Load the `designbook-workflow` skill via the Skill tool.

## Step 1: Check Regeneration

Check if CSS files in `$DESIGNBOOK_DRUPAL_THEME/css/tokens/` are newer than the token file. If up to date, ask the user if they want to force regeneration. Skip workflow creation if not needed (unless forced).

## Step 4: Run Workflow

Follow the `designbook-workflow` skill rules to plan and execute the two stages.

> CSS framework naming and expression format is determined automatically via task files discovered for each stage.
