# Designbook (Drupal module)

Dev-only backend companion for the designbook design system. Bundles two capabilities:

1. **config-schema** — `drush designbook:config-schema <config_name>` (JSON Schema on stdout)
   and `drush designbook:config-validate <config_name> <yaml_path>` (typed-config validation).
2. **preview** — `/designbook/preview/{entity_type}/{entity}/{view_mode}` renders an entity in a
   view mode as a themed page, guarded by the `access designbook preview` permission. Intended for
   screenshot capture by the designbook sync-verify workflow.

## Dev-only — never enable on production

This module MUST NOT be enabled on production. It exposes an unrestricted entity-render route and
config introspection intended only for local/CI design work. Keep it out of the production config
set via a dev config split; there is no runtime environment guard.

Requires `drupal/config_inspector`. Core `^10 || ^11`.
