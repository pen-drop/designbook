---
name: designbook-wordpress
disable-model-invocation: true
user-invocable: false
description: WordPress integration for Designbook — post types, ACF fields, Twig/Timber components, theme.json and WP-CLI sync for projects with `backend: wordpress`.
---

# Designbook — WordPress

Integration skill for `backend: wordpress` projects. Components are plain Twig
(`frameworks.component: twig`), rendered by Twing in Storybook and by Timber in WordPress.
"Sync to backend" generates a content plugin (`<ns>-content`), an Elementor adapter plugin
(`<ns>-elementor`) when that template is configured, and the theme.

## Install

- [install/rules/detect-wordpress.md](install/rules/detect-wordpress.md) — detection and docroot
- [install/rules/find-theme.md](install/rules/find-theme.md) — install target (theme) selection
- [install/blueprints/designbook-config.md](install/blueprints/designbook-config.md) — `designbook.config.yml` incl. `backend_cmd`
- [install/blueprints/storybook-setup.md](install/blueprints/storybook-setup.md) — Storybook with Twing

## Sync

- [sync/rules/sync-units.md](sync/rules/sync-units.md) — generated plugin, theme, and layout units
- [sync/rules/builder-adapter-contract.md](sync/rules/builder-adapter-contract.md) — builder adapter contract
- [sync/blueprints/plugin-bootstrap.md](sync/blueprints/plugin-bootstrap.md) — content plugin
- [sync/blueprints/elementor-plugin.md](sync/blueprints/elementor-plugin.md) — Elementor adapter plugin copy
- [sync/blueprints/elementor-layout.md](sync/blueprints/elementor-layout.md) — Elementor scene seed
- [sync/rules/elementor-support.md](sync/rules/elementor-support.md) — pin, hash, refuse, bump
- [ELEMENTOR.md](../../../packages/integrations/wordpress-fixture/ELEMENTOR.md) — current Elementor pin values
- [sync/blueprints/post-type.md](sync/blueprints/post-type.md) — custom post type
- [sync/blueprints/taxonomy.md](sync/blueprints/taxonomy.md) — taxonomy
- [sync/blueprints/field-group.md](sync/blueprints/field-group.md) — ACF field group
- [sync/blueprints/theme-bootstrap.md](sync/blueprints/theme-bootstrap.md) — theme base view and index
- [sync/blueprints/single-template.md](sync/blueprints/single-template.md) — single template
- [sync/blueprints/single-view.md](sync/blueprints/single-view.md) — single view
- [sync/blueprints/template-parts.md](sync/blueprints/template-parts.md) — header and footer parts
