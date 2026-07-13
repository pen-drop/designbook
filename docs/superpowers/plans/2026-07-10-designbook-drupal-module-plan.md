# designbook Drupal contrib module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the fixture-only `designbook_config_schema` drush helper and a new per-entity/view-mode preview route into one real, dev-only Drupal contrib module `designbook` under `packages/drupal-designbook/`.

**Architecture:** A standalone composer package (`drupal/designbook`, `type: drupal-module`) developed in the monorepo and required by the Drupal fixture via a composer `path` repository. Capability 1 ports the typed-config→JSON-Schema walker + two drush commands verbatim (rewritten to attribute-based command declaration). Capability 2 adds a permission-guarded controller route that renders any entity in any view mode as a themed page.

**Tech Stack:** Drupal 10/11, Drush 13 (attribute commands, `AutowireTrait`), `config_inspector` ^2, DDEV, PHPUnit (BrowserTestBase), composer path repositories.

## Global Constraints

- Module machine name: `designbook`. Composer package: `drupal/designbook`, `type: drupal-module`.
- `core_version_requirement: ^10 || ^11`; dependency `config_inspector` (composer `drupal/config_inspector: ^2`).
- Drush command names are UNCHANGED: `designbook:config-schema` (alias `dcs`), `designbook:config-validate` (alias `dcv`). Downstream (`backend_cmd`, sync tasks, `test-integration-drupal/designbook.config.yml`, `workflow-resolve` vitest, install blueprint) depends on these names.
- No backwards-compat, migration, or legacy-artifact code. The old `web/modules/custom/designbook_config_schema/` directory is deleted outright.
- Dev-only: kept out of the production config set via a dev config split. NO runtime guard in code. README documents "never enable on production".
- `pnpm check` (typecheck → lint → test) must stay green from the repo root; existing sync-to vitest e2e must not break.

---

### Task 1: Scaffold the `designbook` module package

**Files:**
- Create: `packages/drupal-designbook/composer.json`
- Create: `packages/drupal-designbook/designbook.info.yml`
- Create: `packages/drupal-designbook/README.md`

**Interfaces:**
- Produces: an installable (empty-behaviour) Drupal module `designbook` with dependency `config_inspector`, requirable by composer as `drupal/designbook`.

- [ ] **Step 1: Create `composer.json`**

```json
{
    "name": "drupal/designbook",
    "type": "drupal-module",
    "description": "Dev-only designbook backend: config-schema drush commands + per-entity/view-mode preview rendering. Never enable on production.",
    "license": "GPL-2.0-or-later",
    "require": {
        "drupal/core": "^10 || ^11",
        "drupal/config_inspector": "^2"
    }
}
```

- [ ] **Step 2: Create `designbook.info.yml`**

```yaml
name: Designbook
type: module
description: 'Dev-only designbook backend: config-schema introspection/validation drush commands + per-entity/view-mode preview rendering. Never enable on production.'
core_version_requirement: ^10 || ^11
package: Development
dependencies:
  - config_inspector:config_inspector
```

- [ ] **Step 3: Create `README.md`**

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add packages/drupal-designbook/
git commit -m "feat(drupal): scaffold designbook module package"
```

---

### Task 2: Port config-schema drush commands (attribute style) + delete old helper

**Files:**
- Create: `packages/drupal-designbook/src/Drush/Commands/ConfigSchemaCommands.php`
- Delete: `packages/integrations/drupal-fixture/web/modules/custom/designbook_config_schema/` (whole dir)

**Interfaces:**
- Produces: drush commands `designbook:config-schema` (alias `dcs`) and `designbook:config-validate` (alias `dcv`) with identical stdout/stderr/exit-code behaviour to the old helper.
- Consumes: `@config.typed` (`TypedConfigManagerInterface`), `config_inspector`'s `ConfigInspectorManager::violationsToArray()`.

- [ ] **Step 1: Create the attribute-based command class**

Port the walker, `scalarToJsonSchemaType`, `forceEmptySchemasToObjects`, `configSchema`, and `configValidate` bodies VERBATIM from the old `designbook_config_schema/src/Commands/ConfigSchemaCommands.php` (only the class namespace + command-declaration mechanism change). Full class:

```php
<?php

declare(strict_types=1);

namespace Drupal\designbook\Drush\Commands;

use Drupal\Core\Config\TypedConfigManagerInterface;
use Drupal\config_inspector\ConfigInspectorManager;
use Drush\Attributes as CLI;
use Drush\Commands\AutowireTrait;
use Drush\Commands\DrushCommands;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Yaml\Yaml;

/**
 * Drush commands for designbook sync: schema emission + YAML validation.
 */
final class ConfigSchemaCommands extends DrushCommands {

  use AutowireTrait;

  public function __construct(
    #[Autowire(service: 'config.typed')]
    protected TypedConfigManagerInterface $typedConfig,
  ) {
    parent::__construct();
  }

  private function scalarToJsonSchemaType(string $type): ?string {
    $map = [
      'string' => 'string', 'text' => 'string', 'label' => 'string',
      'required_label' => 'string', 'uri' => 'string', 'uuid' => 'string',
      'email' => 'string', 'langcode' => 'string', 'machine_name' => 'string',
      'color_hex' => 'string', 'path' => 'string', 'boolean' => 'boolean',
      'integer' => 'integer', 'float' => 'number', 'weight' => 'integer',
    ];
    return $map[$type] ?? NULL;
  }

  private function walkDefinition(array $definition, TypedConfigManagerInterface $tcm, int $depth = 0): array {
    if ($depth > 4) {
      return [];
    }
    $type = $definition['type'] ?? '';
    $class = $definition['class'] ?? '';
    if (isset($definition['mapping']) || str_contains($class, 'Mapping')) {
      $schema = ['type' => 'object', 'properties' => [], 'required' => []];
      foreach (($definition['mapping'] ?? []) as $key => $propDef) {
        $resolved = $propDef;
        if (!isset($propDef['mapping']) && !isset($propDef['sequence']) && isset($propDef['type'])) {
          try {
            $resolved = $tcm->getDefinition($propDef['type']);
          }
          catch (\Exception) {
          }
        }
        $schema['properties'][$key] = $this->walkDefinition($resolved, $tcm, $depth + 1);
        if (!isset($propDef['requiredKey']) || $propDef['requiredKey'] !== FALSE) {
          $schema['required'][] = $key;
        }
      }
      if ($depth === 0) {
        $schema['required'] = array_values(array_diff($schema['required'] ?? [], ['uuid', '_core']));
      }
      if (empty($schema['required'])) {
        unset($schema['required']);
      }
      if (empty($schema['properties'])) {
        unset($schema['properties']);
      }
      return $schema;
    }
    if (isset($definition['sequence']) || str_contains($class, 'Sequence')) {
      $schema = ['type' => ['array', 'object']];
      if (isset($definition['sequence'])) {
        $schema['items'] = $this->walkDefinition($definition['sequence'], $tcm, $depth + 1);
      }
      return $schema;
    }
    $primitive = $this->scalarToJsonSchemaType($type);
    if ($primitive !== NULL) {
      return ['type' => $primitive];
    }
    if ($type !== '' && $depth < 4) {
      try {
        $resolved = $tcm->getDefinition($type);
        return $this->walkDefinition($resolved, $tcm, $depth + 1);
      }
      catch (\Exception) {
      }
    }
    return [];
  }

  private function forceEmptySchemasToObjects(array $schema): array|\stdClass {
    if (isset($schema['items'])) {
      $schema['items'] = empty($schema['items']) ? new \stdClass() : $this->forceEmptySchemasToObjects($schema['items']);
    }
    if (isset($schema['properties'])) {
      foreach ($schema['properties'] as $key => $propSchema) {
        $schema['properties'][$key] = empty($propSchema) ? new \stdClass() : $this->forceEmptySchemasToObjects($propSchema);
      }
    }
    return $schema;
  }

  #[CLI\Command(name: 'designbook:config-schema', aliases: ['dcs'])]
  #[CLI\Argument(name: 'config_name', description: 'The Drupal config object name, e.g. node.type.article.')]
  #[CLI\Usage(name: 'drush designbook:config-schema node.type.article', description: 'Print the JSON Schema for node.type.article.')]
  public function configSchema(string $config_name): void {
    $definition = $this->typedConfig->getDefinition($config_name);
    $schema = $this->walkDefinition($definition, $this->typedConfig);
    $schema = empty($schema) ? new \stdClass() : $this->forceEmptySchemasToObjects($schema);
    fwrite(STDOUT, json_encode($schema, JSON_THROW_ON_ERROR) . PHP_EOL);
  }

  #[CLI\Command(name: 'designbook:config-validate', aliases: ['dcv'])]
  #[CLI\Argument(name: 'config_name', description: 'The Drupal config object name, e.g. node.type.article.')]
  #[CLI\Argument(name: 'yaml_path', description: 'Absolute path (inside the container) to the YAML file to validate.')]
  #[CLI\Usage(name: 'drush designbook:config-validate node.type.article /tmp/test.yml', description: 'Validate /tmp/test.yml against the node.type.article schema.')]
  public function configValidate(string $config_name, string $yaml_path): void {
    if (!file_exists($yaml_path)) {
      fwrite(STDERR, "File not found: $yaml_path" . PHP_EOL);
      exit(1);
    }
    $data = Yaml::parse(file_get_contents($yaml_path));
    $definition = $this->typedConfig->getDefinition($config_name);
    $dataDefinition = $this->typedConfig->buildDataDefinition($definition, $data);
    $typedData = $this->typedConfig->create($dataDefinition, $data, $config_name);
    $violations = $typedData->validate();
    if (count($violations) === 0) {
      return;
    }
    $detail = ConfigInspectorManager::violationsToArray($violations);
    fwrite(STDERR, json_encode($detail, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT) . PHP_EOL);
    exit(1);
  }

}
```

- [ ] **Step 2: Delete the old helper module**

```bash
git rm -r packages/integrations/drupal-fixture/web/modules/custom/designbook_config_schema
```

(No `drush.services.yml` in the new module — Drush 13 auto-discovers attribute command classes in `Drupal\designbook\Drush\Commands`, and `AutowireTrait` supplies the container factory.)

- [ ] **Step 3: Verify command discovery + behaviour in the workspace**

Deferred to the fixture-wiring task (Task 4) — the commands can only run once the module is installed in a live Drupal. Verification steps live there.

- [ ] **Step 4: Commit**

```bash
git add packages/drupal-designbook/src packages/integrations/drupal-fixture/web/modules/custom
git commit -m "feat(drupal): port config-schema/config-validate as attribute drush commands; drop old helper"
```

---

### Task 3: Preview route + permission + controller (TDD)

**Files:**
- Create: `packages/drupal-designbook/designbook.routing.yml`
- Create: `packages/drupal-designbook/designbook.permissions.yml`
- Create: `packages/drupal-designbook/src/Controller/PreviewController.php`
- Test: `packages/drupal-designbook/tests/src/Functional/PreviewRouteTest.php`

**Interfaces:**
- Produces: route `designbook.preview` at `/designbook/preview/{entity_type}/{entity}/{view_mode}`; permission `access designbook preview`; `PreviewController::preview(string $entity_type, string $entity, string $view_mode): array`.

- [ ] **Step 1: Write the failing Functional test**

```php
<?php

declare(strict_types=1);

namespace Drupal\Tests\designbook\Functional;

use Drupal\Tests\BrowserTestBase;

/**
 * Tests the designbook preview route access + rendering.
 */
final class PreviewRouteTest extends BrowserTestBase {

  protected $defaultTheme = 'stark';

  protected static $modules = ['designbook', 'config_inspector', 'node'];

  private \Drupal\node\NodeInterface $node;

  protected function setUp(): void {
    parent::setUp();
    $this->drupalCreateContentType(['type' => 'article', 'name' => 'Article']);
    $this->node = $this->drupalCreateNode(['type' => 'article', 'title' => 'Preview me']);
  }

  public function testPreviewReturns200WithPermission(): void {
    $this->drupalLogin($this->drupalCreateUser(['access designbook preview']));
    $this->drupalGet('/designbook/preview/node/' . $this->node->id() . '/full');
    $this->assertSession()->statusCodeEquals(200);
    $this->assertSession()->pageTextContains('Preview me');
  }

  public function testPreviewReturns403WithoutPermission(): void {
    $this->drupalLogin($this->drupalCreateUser([]));
    $this->drupalGet('/designbook/preview/node/' . $this->node->id() . '/full');
    $this->assertSession()->statusCodeEquals(403);
  }

  public function testPreviewReturns404ForMissingEntity(): void {
    $this->drupalLogin($this->drupalCreateUser(['access designbook preview']));
    $this->drupalGet('/designbook/preview/node/999999/full');
    $this->assertSession()->statusCodeEquals(404);
  }

}
```

- [ ] **Step 2: Run the test, verify it fails**

Run (in the DDEV workspace, after Task 4 installs the module):
`ddev exec vendor/bin/phpunit -c web/core web/modules/contrib/designbook/tests/src/Functional/PreviewRouteTest.php`
Expected: FAIL — route `/designbook/preview/...` not found (404 for the 200/403 cases).

- [ ] **Step 3: Create `designbook.permissions.yml`**

```yaml
access designbook preview:
  title: 'Access designbook preview'
  description: 'Render any entity in any view mode via the designbook preview route. Dev-only.'
  restrict access: true
```

- [ ] **Step 4: Create `designbook.routing.yml`**

```yaml
designbook.preview:
  path: '/designbook/preview/{entity_type}/{entity}/{view_mode}'
  defaults:
    _controller: '\Drupal\designbook\Controller\PreviewController::preview'
    _title: 'Designbook preview'
  requirements:
    _permission: 'access designbook preview'
```

- [ ] **Step 5: Create `PreviewController.php`**

```php
<?php

declare(strict_types=1);

namespace Drupal\designbook\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Renders an entity in a view mode as a themed page (dev-only preview).
 */
final class PreviewController extends ControllerBase {

  /**
   * Renders {entity} of {entity_type} in {view_mode}.
   *
   * @return array
   *   A render array; Drupal wraps it in the themed page (HTTP 200).
   */
  public function preview(string $entity_type, string $entity, string $view_mode): array {
    if (!$this->entityTypeManager()->hasDefinition($entity_type)) {
      throw new NotFoundHttpException();
    }
    $loaded = $this->entityTypeManager()->getStorage($entity_type)->load($entity);
    if ($loaded === NULL) {
      throw new NotFoundHttpException();
    }
    return $this->entityTypeManager()->getViewBuilder($entity_type)->view($loaded, $view_mode);
  }

}
```

- [ ] **Step 6: Rebuild + run the test, verify it passes**

Run: `ddev drush cr && ddev exec vendor/bin/phpunit -c web/core web/modules/contrib/designbook/tests/src/Functional/PreviewRouteTest.php`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add packages/drupal-designbook/designbook.routing.yml packages/drupal-designbook/designbook.permissions.yml packages/drupal-designbook/src/Controller packages/drupal-designbook/tests
git commit -m "feat(drupal): add permission-guarded entity preview route + functional test"
```

---

### Task 4: Fixture wiring — path repository, module enable, doc refs

**Files:**
- Create: `packages/integrations/drupal-fixture/.ddev/docker-compose.designbook.yaml`
- Modify: `packages/integrations/drupal-fixture/composer.json` (add path repository + require)
- Modify: `scripts/start-drupal-workspace.sh:12`
- Modify: `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md` (prose refs only)

**Interfaces:**
- Consumes: the `drupal/designbook` package from Task 1–3.
- Produces: a fixture that materializes with `designbook` installed under `web/modules/contrib/designbook`, enabled by `start-drupal-workspace.sh`.

> **VALIDATE FIRST — integration risk.** `prepare-drupal-fixture.sh` runs `ddev composer install` INSIDE the fixture container (`/var/www/html`). A composer `path` repo pointing at `packages/drupal-designbook` (outside the mounted project) is NOT visible in-container. This task bind-mounts the module into the container and uses a `path` repo with `symlink: false` (composer COPIES the module into `web/modules/contrib/designbook`, so the rsync'd workspace and `ddev exec phpunit`/`drush` all see real files). If the bind-mount + in-container `ddev composer install` does not resolve the package, STOP and escalate — do not fall back to physically relocating the module or committing vendored copies.

- [ ] **Step 1: Add the DDEV bind mount for the module source**

Create `packages/integrations/drupal-fixture/.ddev/docker-compose.designbook.yaml` (compose paths are relative to `.ddev/`; `../../../drupal-designbook` = `packages/drupal-designbook`):

```yaml
services:
  web:
    volumes:
      - "../../../drupal-designbook:/var/www/designbook:ro"
```

- [ ] **Step 2: Add the composer path repository + require to the fixture**

In `packages/integrations/drupal-fixture/composer.json`, add to the `repositories` array (alongside the existing `packages.drupal.org` entry):

```json
{
    "type": "path",
    "url": "/var/www/designbook",
    "options": { "symlink": false }
}
```

and add to `require`:

```json
"drupal/designbook": "@dev"
```

- [ ] **Step 3: Re-materialize the fixture and verify the package resolves in-container**

```bash
rm -rf packages/integrations/drupal-fixture/vendor packages/integrations/drupal-fixture/web/core
./scripts/prepare-drupal-fixture.sh
ls packages/integrations/drupal-fixture/web/modules/contrib/designbook/designbook.info.yml
```

Expected: the `designbook.info.yml` path exists (module copied in-container by composer). If composer errors that it cannot find `/var/www/designbook`, the mount is wrong — STOP and escalate.

- [ ] **Step 4: Update the workspace start script**

In `scripts/start-drupal-workspace.sh`, change line 12:

```bash
ddev drush pm:enable designbook -y
```

(was `ddev drush pm:enable designbook_config_schema -y`).

- [ ] **Step 5: Update the install blueprint prose**

In `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md`, replace the two prose references (`web/modules/custom/designbook_config_schema/`, and "the designbook_config_schema drush helper module") to name the module `designbook` shipped under `packages/drupal-designbook/` and enabled by `scripts/start-drupal-workspace.sh`. Leave the `backend_cmd` command STRINGS and NAMES (`designbook:config-schema`, `designbook:config-validate`) unchanged.

- [ ] **Step 6: End-to-end verify the acceptance criteria in a fresh workspace**

```bash
./scripts/setup-workspace.sh designbook-1
./scripts/start-drupal-workspace.sh designbook-1
cd workspaces/designbook-1
# AC1
ddev drush designbook:config-schema node.type.article; echo "exit=$?"
# AC2 (valid → 0; invalid → non-zero + violation detail)
ddev drush designbook:config-validate node.type.article /path/to/valid.yml; echo "exit=$?"
ddev drush designbook:config-validate node.type.article /path/to/invalid.yml; echo "exit=$?"
# AC3 (403 anon, 200 with permission)
ddev exec vendor/bin/phpunit -c web/core web/modules/contrib/designbook/tests/src/Functional/PreviewRouteTest.php
# AC4 (module installed + enabled; old helper absent)
ddev drush pm:list --status=enabled | grep designbook
test ! -d web/modules/custom/designbook_config_schema && echo "old helper gone"
```

Expected: AC1 exit 0 + JSON Schema; AC2 exit 0 valid / non-zero invalid; AC3 phpunit green; AC4 designbook enabled + old helper absent.

- [ ] **Step 7: Verify the repo suite stays green (AC5)**

```bash
cd <repo-root>
pnpm check
```

Expected: typecheck + lint + vitest all pass (the sync-to e2e that shell out to `designbook:config-schema`/`config-validate` still work — command names unchanged).

- [ ] **Step 8: Commit**

```bash
git add packages/integrations/drupal-fixture/.ddev/docker-compose.designbook.yaml packages/integrations/drupal-fixture/composer.json packages/integrations/drupal-fixture/composer.lock scripts/start-drupal-workspace.sh .agents/skills/designbook-drupal/install/blueprints/designbook-config.md
git commit -m "chore(fixture): require designbook via path repo, enable it, update blueprint refs"
```

---

## Notes for the implementer

- **AC6 (dev-only)** needs no code task: the module is dev-only by virtue of being absent from the production config set (dev config split) + the README statement (Task 1, Step 3). Do NOT add a runtime environment guard.
- The `config-schema`/`config-validate` command bodies are copied verbatim — do not "improve" the walker; behaviour parity is what keeps the sync-to e2e green.
- `symlink: false` on the path repo is deliberate: a symlink would point at an in-container absolute path that is meaningless in the rsync'd workspace and would break `ddev exec phpunit`/`drush` there.
