# designbook Drupal contrib module — config-schema + preview modes

**Ticket:** DESIGNBOOK-1 · **Workflow:** gaia_feature · **State:** spec

## Goal

Consolidate two backend capabilities into one real, dev-only Drupal contrib module
`designbook` (machine name `designbook`), developed in the monorepo under
`packages/drupal-designbook/` and later extractable to drupal.org:

1. **config-schema introspection/validation** — currently a fixture-only helper module
   `designbook_config_schema`.
2. **per-entity/view-mode preview rendering** for screenshot capture — the mechanism left
   OPEN in the config-sync design (`docs/superpowers/specs/2026-06-26-drupal-config-sync-design.md`
   § *Drupal render capture — OPEN*, option B).

The module is **dev-only**: kept out of the production config set via a dev config split,
simply not installed in production. **No runtime guard.** README documents this.

## Non-goals

- Extraction/publish to drupal.org (separate ticket).
- Any backwards-compat or migration code — the old fixture helper is deleted outright
  (project CLAUDE.md: existing on-disk artifacts are disposable, testing is from scratch).
- Changing the drush command *names* — `backend_cmd`, sync tasks, and existing sync-to
  tests depend on them.

## Packaging

- New composer package `packages/drupal-designbook/`:
  - name `drupal/designbook`, `type: drupal-module`
  - `require`: `drupal/core: ^10 || ^11`, `drupal/config_inspector: ^2`
- Fixture `packages/integrations/drupal-fixture/composer.json`:
  - add a `path` repository `{ "type": "path", "url": "../../drupal-designbook" }`
  - `require` `drupal/designbook: @dev`
  - `drupal/config_inspector` is already required there.
- The old `web/modules/custom/designbook_config_schema/` directory is **deleted**.

## Module tree

```
packages/drupal-designbook/
  composer.json
  designbook.info.yml            # core_version_requirement ^10 || ^11; dependencies: config_inspector
  designbook.routing.yml         # preview route
  designbook.permissions.yml     # "access designbook preview"
  README.md                      # dev-only statement
  src/Drush/Commands/ConfigSchemaCommands.php   # attribute-based drush commands
  src/Controller/PreviewController.php
  tests/src/Functional/PreviewRouteTest.php
```

No `drush.services.yml` — attribute-based commands use dependency autowiring.

## Capability 1 — config-schema (behaviour unchanged)

Port the existing walker and both commands from
`designbook_config_schema/src/Commands/ConfigSchemaCommands.php` into
`Drupal\designbook\Drush\Commands\ConfigSchemaCommands`, rewritten to **modern PHP
attributes** (`#[CLI\Command(...)]`, `AutowireTrait`, autowired `@config.typed`). Logic —
the typed-config → JSON Schema walker, the empty-schema→`{}` normalization, the
typed-data validation with `ConfigInspectorManager::violationsToArray()` — is copied
verbatim; only the command-declaration mechanism changes.

**Command names stay exactly:**

- `designbook:config-schema <config_name>` (alias `dcs`) → JSON Schema on stdout, exit 0.
- `designbook:config-validate <config_name> <yaml_path>` (alias `dcv`) → exit 0 valid;
  exit 1 + violation JSON on stderr when invalid.

Consumers that keep working unchanged: `backend_cmd.schema_cmd` / `validate_cmd` in the
sync tasks, `packages/integrations/test-integration-drupal/designbook.config.yml`, the
`workflow-resolve` vitest, and the install blueprint.

## Capability 2 — preview route (new)

- **Route** `designbook.preview` in `designbook.routing.yml`:
  `/designbook/preview/{entity_type}/{entity}/{view_mode}`,
  `_controller: '\Drupal\designbook\Controller\PreviewController::preview'`,
  `_permission: 'access designbook preview'`.
- **Controller** `PreviewController::preview(string $entity_type, string $entity, string $view_mode)`:
  loads the entity through `EntityTypeManagerInterface`; returns
  `getViewBuilder($entity_type)->view($loaded, $view_mode)` as a render array — Drupal
  wraps it in the themed page, so the response is a **200 themed HTML page** with full
  render context (theme, libraries, CSS). Unknown entity type or missing entity → 404
  (`NotFoundHttpException`).
- **Permission** `access designbook preview` in `designbook.permissions.yml`
  (`restrict access: true`). Without it the route returns **403**.

## Prod-off

Dev-only through a dev config split (module simply absent from the production config set).
No runtime environment guard in code. README states the module must never be enabled on
production.

## Wiring updates

- `scripts/start-drupal-workspace.sh` line 12:
  `ddev drush pm:enable designbook_config_schema -y` → `ddev drush pm:enable designbook -y`.
- `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md`: update the
  two prose references to the old module machine name/location to the new module
  `designbook` at `packages/drupal-designbook/` (the `backend_cmd` command strings and
  names are unchanged).

## Design aspect

The repo's `design` aspect injects a `ui_or_design` sub-decision (plan UI artifacts with
`debo`). It **does not match** this ticket: there are no components, screens, scenes, or
design tokens — the work is pure backend PHP. No `debo` planning runs.

## Testing / verification

- **In-module:** `tests/src/Functional/PreviewRouteTest.php` (BrowserTestBase) —
  `testPreviewReturns200WithPermission()` and `testPreviewReturns403WithoutPermission()`.
  Run via `ddev exec phpunit` in the DDEV workspace.
- **Repo suite:** `pnpm check` (typecheck → lint → test) from repo root — the existing
  sync-to vitest e2e that shell out to the drush commands must stay green (AC5).
- **Manual/e2e in coding:** DDEV workspace — `drush designbook:config-schema`,
  `drush designbook:config-validate` (valid + invalid), and `curl` the preview route with
  and without the permission to confirm 200/403 and 404 for a missing entity.

## Acceptance criteria mapping

- AC1 `config-schema` → capability 1 command, name unchanged.
- AC2 `config-validate` → capability 1 command, name unchanged.
- AC3 preview 200/403 → capability 2 route + permission; Functional test.
- AC4 installs on D10 + D11 with `config_inspector`, fixture enables `designbook`, old
  helper removed → packaging + info.yml + start-drupal-workspace.sh + delete.
- AC5 sync-to unchanged, tests green → command names unchanged + `pnpm check`.
- AC6 dev-only + README → prod-off section + README.
