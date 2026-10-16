---
name: designbook-wordpress
disable-model-invocation: true
user-invocable: false
description: WordPress integration for Designbook — post types, ACF fields, Twig/Timber components, theme.json and WP-CLI sync for projects with `backend: wordpress`.
---

# Designbook — WordPress

Integration skill for `backend: wordpress` projects. Components are plain Twig
(`frameworks.component: twig`), rendered by Twing in Storybook and by Timber in WordPress.
"Sync to backend" generates a plugin (`<ns>-content`) and the theme instead of importing
config.

## Install

- [install/rules/detect-wordpress.md](install/rules/detect-wordpress.md) — detection and docroot
- [install/rules/find-theme.md](install/rules/find-theme.md) — install target (theme) selection
- [install/blueprints/designbook-config.md](install/blueprints/designbook-config.md) — `designbook.config.yml` incl. `backend_cmd`
- [install/blueprints/storybook-setup.md](install/blueprints/storybook-setup.md) — Storybook with Twing

## Sync

- [sync/rules/sync-units.md](sync/rules/sync-units.md) — plugin, theme, and Bricks `layout.<scene>` units
- [sync/rules/builder-adapter-contract.md](sync/rules/builder-adapter-contract.md) — adapter interface
- [sync/rules/bricks-version.md](sync/rules/bricks-version.md) — Bricks 2.0+ (`extensions: bricks`)
- [sync/blueprints/plugin-bootstrap.md](sync/blueprints/plugin-bootstrap.md) — content plugin including the Bricks adapter
- [sync/blueprints/layout-bricks.md](sync/blueprints/layout-bricks.md) — scene seed for `_bricks_page_content_2`
