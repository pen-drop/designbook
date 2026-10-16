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

## Gutenberg

- [gutenberg/rules/gutenberg-contract.md](gutenberg/rules/gutenberg-contract.md) — block names, schema attributes, slots, registry-only reads
- [gutenberg/blueprints/adapter.md](gutenberg/blueprints/adapter.md) — generated adapter PHP, editor script and `block.json`
