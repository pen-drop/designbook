# Drupal

The `designbook-drupal` plugin adds Drupal-backend and SDC-framework tasks, rules, and blueprints. It is a marketplace plugin: `/plugin install designbook-drupal@designbook`.

## Prerequisites

- Drupal project (composer `drupal/core*`) or a Designbook test workspace from `./scripts/setup-workspace.sh`
- `backend: drupal` in `designbook.config.yml`
- `frameworks.component: sdc` for Single Directory Components
- Theme directory as `designbook.home` (workspaces use `web/themes/custom/<theme>`)

Install detection lives in `designbook-drupal/install/rules/detect-drupal.md` and `find-theme.md`. The config starting point is `install/blueprints/designbook-config.md`.

## What it contributes

- Data model conventions (`field_` prefix, composition per bundle, Canvas and Layout Builder rules)
- Entity mapping blueprints and rules (`map-entity`)
- Sample data rules for Canvas, Layout Builder, formatted text, image, link
- SDC component tasks, `components/schemas.yml`, Twig/YAML constraints
- Layout blueprints: container, grid, section
- `sync-to` exports a filtered data-model subset as Drupal config YAML into config-sync

Canonical fixture excerpt (`fixtures/drupal-petshop/designbook.config.yml`):

```yaml
backend: drupal
frameworks:
  component: sdc
  css: tailwind
extensions:
  - id: website
  - id: storybook
```

## Verification

Reconcile a backend render against Storybook with **sync-verify**, not config-verify. Ask the agent to run the `sync-verify` workflow. `sync-to` is export; `sync-verify` is the check.

Enablement: [add an extension](/extend/add-an-extension) and [configuration](/extend/configuration). This page does not replace those procedures.
