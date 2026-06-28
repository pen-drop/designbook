---
trigger:
  steps: [write-config]
filter:
  backend: drupal
---

# Blueprint: Drupal designbook.config.yml

A starting point for the `designbook.config.yml` written into the theme root.
Substitute `__NAMESPACE__` with the resolved theme machine name.

```yaml
backend: drupal
frameworks:
  component: sdc
  css: css
designbook:
  cmd: npx storybook dev
  home: .
  url: "http://localhost:6006"
dirs:
  components: components
  css:
    tokens: css/tokens
    themes: css/themes
css:
  app: css/app.src.css
component:
  namespace: '__NAMESPACE__'
  src: components
extensions:
  - id: drupal
    skill: designbook-drupal
# Backend command strings — interpolated as {{ backend_cmd.* }} by sync tasks.
# Core runs these opaquely; no drush/Drupal knowledge lives in core. Built on
# existing drush + config_inspector. Exact schema_cmd/validate_cmd realization is
# finalized in Plan 3 (still data strings, not authored code).
backend_cmd:
  cmd: "ddev drush"
  schema_cmd: "ddev drush designbook:config-schema"   # prints JSON Schema for a config name (existing typed-config/config_inspector capability)
  validate_cmd: "ddev drush config:inspect --detail"  # non-zero exit on schema violation
```

The port in `designbook.url` must match the `-p` argument of the `storybook` script in
`package.json` (fresh installs use 6006). The verify step still derives the live URL
from the start command's `port` output — the config value is a default for later use.

The chosen CSS framework's rules may update `frameworks.css` and append to
`extensions`.

`css.app` declares where the application CSS entry point will live; the file itself is
created later (by a CSS-framework rule or the css-generate workflow) — do not create it
during install for plain CSS.

## backend_cmd — data for sync task interpolation

The `backend_cmd` block is **data only** — its values are consumed as
`{{ backend_cmd.cmd }}`, `{{ backend_cmd.schema_cmd }}`, and
`{{ backend_cmd.validate_cmd }}` by sync tasks (Plan 3). Core runs the resulting
command strings opaquely: no drush or Drupal knowledge lives in core. The three
commands are built on the existing `drush` CLI and the `config_inspector` module
capability already present in a Drupal install. The exact realization of
`schema_cmd` and `validate_cmd` is finalized in Plan 3; they remain plain data
strings here.
