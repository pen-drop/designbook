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
# Core runs these opaquely; no drush/Drupal knowledge lives in core.
# Both commands are provided by the designbook module, published to drupal.org
# (drupal/designbook, https://www.drupal.org/project/designbook, 1.x) and required
# like any other contrib module.
backend_cmd:
  cmd: "ddev drush"
  schema_cmd: "ddev drush designbook:config-schema"   # prints JSON Schema for a config name; append config name
  validate_cmd: "ddev drush designbook:config-validate"  # exit non-zero + violations on stderr when invalid; append config name + yaml path
  ui_pattern_cmd: "ddev drush designbook:ui-pattern"  # emits the whole ui_patterns block (component_id, variant_id, props, slots) as JSON; append '<set>:<component>' --props=<json ComponentNode props/slots>
  import: "ddev drush config:import --partial -y --source=/var/www/html/web/sites/default/files/sync"  # container path is the in-container view of the host config_sync_dir that write-config's YAML lands in
  exists_cmd: "ddev drush config:get"  # exit 0 iff a config object already exists; append config name. Used by resolve-filter to skip config that is already present.
  # Scene sync (unit: scene) only — content counterparts of exists_cmd/import plus the page URL.
  # content_exists_cmd / page_url_cmd are SUBSTITUTION templates ({content_ref}, like renderUrlCommand's
  # {config_id}); content_import_cmd is run as-is. All are plain drush eval — no custom module needed.
  content_exists_cmd: "ddev drush eval \"if (!(\\Drupal::service('entity.repository')->loadEntityByUuid('block_content','{content_ref}') ?: \\Drupal::service('entity.repository')->loadEntityByUuid('node','{content_ref}'))) throw new \\Exception('absent');\""  # exit 0 iff a content entity with content_ref (uuid) exists (drush eval ignores PHP exit(); throw to signal absence → non-zero exit).
  content_import_cmd: "ddev drush eval \"foreach (glob('/var/www/html/web/sites/default/files/content/*.yml') as \\$f) { /* parse payload, load-or-create entity by its uuid, set fields (blocks) or layout_builder__layout/component_tree (page), save */ }\""  # creates/upserts staged content payloads by uuid; idempotent. Run as-is.
  page_url_cmd: "ddev drush eval \"print \\Drupal::service('entity.repository')->loadEntityByUuid('node','{content_ref}')->toUrl('canonical',['absolute'=>TRUE])->toString();\""  # canonical URL of a synced page.
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
`{{ backend_cmd.cmd }}`, `{{ backend_cmd.schema_cmd }}`, `{{ backend_cmd.validate_cmd }}`,
`{{ backend_cmd.ui_pattern_cmd }}`, `{{ backend_cmd.import }}`, and `{{ backend_cmd.exists_cmd }}`
by sync and data-mapping tasks. Core runs the resulting command strings opaquely: no drush or
Drupal knowledge lives in core.

`schema_cmd` calls `designbook:config-schema <config_name>` → JSON Schema on stdout,
exit 0. `validate_cmd` calls `designbook:config-validate <config_name> <yaml_path>` →
exit 0 when valid; exit 1 + violation JSON on stderr when invalid. `ui_pattern_cmd` calls
`designbook:ui-pattern '<set>:<component>' --props=<json>` → the whole `ui_patterns` block
(`component_id`, `variant_id`, `props`, `slots`) as JSON on stdout, exit 0; it is the source of
truth for the Drupal-registry half of the UI Patterns 2 mapping (see the `ui-patterns`
data-mapping blueprint). `schema_cmd`/`validate_cmd` are implemented in the `designbook` module;
`ui_pattern_cmd` in its `designbook_ui_patterns` submodule (which depends on `ui_patterns` 2.x).
All are published to drupal.org as `drupal/designbook`
(https://www.drupal.org/project/designbook, 1.x) and required like any other contrib module.

`import` is a complete, ready-to-run command that applies the config-sync directory to
the live backend. `write-config`'s YAML lands host-side at the resolved
`config_sync_dir`; `import` targets that same directory from the backend's own vantage
point (e.g. a ddev container sees the host `<workspace>/web/sites/default/files/sync`
at `/var/www/html/web/sites/default/files/sync`) — same physical files, two path views.

`exists_cmd` calls `config:get <config_name>` → exit 0 when the config object already
exists in the live backend, non-zero when it is absent. `resolve-filter` appends each
candidate `config_name` to this command to decide whether to keep or drop that unit —
this is how the sync workflow skips config that already exists (core view modes,
previously-synced bundles/fields, environment-provided config) without any data-model
markers or pre-seeding.

`content_exists_cmd`, `content_import_cmd`, and `page_url_cmd` are used only by a
`unit: scene` sync (they are absent from a config-only project). They are the content
counterparts of `exists_cmd`/`import` plus the page-URL lookup. `content_exists_cmd` and
`page_url_cmd` are **substitution templates** — the `{content_ref}` placeholder is replaced
with the unit's deterministic uuid before running (the same mechanism `renderUrlCommand` uses
for `{config_id}`), so they work as plain `drush eval` without a custom module: `content_exists_cmd`
exits 0 iff an entity with that uuid exists (so `resolve-filter` skips already-synced content,
keeping the second run idempotent), and `page_url_cmd` prints the synced page's canonical URL for
`sync-to`'s outtake. `content_import_cmd` is run as-is: `transform-content` writes the payloads
host-side under `$DESIGNBOOK_DATA/sync/content`, and this command creates/upserts them by uuid
(idempotent). No Drupal knowledge lives in core — these are opaque command strings in project config.
