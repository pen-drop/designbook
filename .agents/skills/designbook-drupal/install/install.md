---
name: install
description: Drupal-specific designbook install steps, dispatched from the core install flow.
---

# Designbook Install — Drupal

Execute the steps in order. Each step file defines its own abort conditions.
Variables (`DOCROOT`, `THEME_DIR`, `NAMESPACE`) are set by earlier steps and consumed by later ones.

1. [detect.md](detect.md) — confirm the Drupal codebase, determine `DOCROOT`
2. [theme.md](theme.md) — find or scaffold the target theme → `THEME_DIR`, `NAMESPACE`
3. [storybook.md](storybook.md) — set up or extend Storybook in `THEME_DIR`
4. [config.md](config.md) — write `designbook.config.yml` into `THEME_DIR`
5. CSS framework — collect every installed `designbook-css-*` skill that ships
   `install/install.md`. Evaluate each skill's Detection section against
   `THEME_DIR` to determine the suggested default, then ask the user to choose
   between those skills and plain CSS (no framework). Plain CSS → done. Otherwise
   follow the chosen skill's install steps.

Then return to Phase 4 (Verify) of the core install flow
(`designbook/install/workflows/install.md`).
