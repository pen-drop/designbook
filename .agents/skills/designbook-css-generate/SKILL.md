---
name: designbook-css-generate
description: Framework-agnostic CSS generation pipeline from W3C Design Tokens. Executes all JSONata expression files from the active CSS framework skill and ensures the project's app.css imports the generated token files.
---

# Designbook CSS Generate

Executes all `.jsonata` expression files produced by the active CSS framework skill and keeps the project's `app.css` up to date with the generated token imports.

The output path for `app.css` is project-configurable via `designbook.config.yml` → `css.app` (`$DESIGNBOOK_CSS_APP`).

## Task

See `tasks/generate-css.md` for the full execution steps.
