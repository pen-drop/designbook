# designbook_ui_patterns — drush UI Patterns 2 source mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `designbook_ui_patterns` submodule to the external `designbook` Drupal module whose single drush command returns the deterministic Drupal-registry half of the UI Patterns 2 data-mapping by querying UIP's live PropType/source registry, and thin `ui-patterns.md` to scene-intent-only prose.

**Architecture:** The submodule (AC-1..4) is authored in a local clone of `git.drupalcode.org/project/designbook` branched off `1.x` and lands via a drupal.org MR. This monorepo's DESIGNBOOK-10 MR carries AC-5 (blueprint thinning) + `backend_cmd` command strings + fixture wiring (`ui_patterns` dep, a variant SDC component, workspace enable) + spec/plan docs. The command is a Drush attribute-command class mirroring the existing `ConfigSchemaCommands`, autowiring the SDC + UIP source/prop_type plugin managers; it emits only registry-derived structure, never scene-intent.

**Tech Stack:** Drupal 10/11, Drush 13 (attribute commands, `AutowireTrait`), UI Patterns 2.x (`plugin.manager.ui_patterns_source`, `plugin.manager.ui_patterns_prop_type`), core SDC (`plugin.manager.sdc`, decorated by UIP `ComponentPluginManager`), DDEV, `debo-test`.

## Global Constraints

- Submodule machine name: `designbook_ui_patterns`; `type: module`, `package: Development`, `core_version_requirement: ^10 || ^11`, dependencies `ui_patterns:ui_patterns` + `core:sdc`.
- Drush command name: `designbook:ui-pattern` (single command — the whole `ui_patterns` block in one call, no per-prop loop). JSON on stdout, exit 0 on success.
- Verified UIP 2.x service ids: `plugin.manager.ui_patterns_source` (`SourcePluginManager`), `plugin.manager.ui_patterns_prop_type` (`PropTypePluginManager`), `plugin.manager.sdc` (decorated).
- Verified registry APIs: `PropTypePluginManager::guessFromSchema(array): ?PropTypeInterface`; `SourcePluginManager::getPropTypeDefault(string, array, array): ?string`; `SourcePluginManager::getDefinitionsForPropType(string, ?array, array): array`.
- Verified source ids: `checkbox`, `select`, `textfield`, `url`, `token`, `attributes`, `entity_field`, `field_property`, `component`. Verified prop types include `boolean`, `string`, `enum`, `number`, `url`, `attributes`, `slot`, `variant`.
- No migration / backwards-compat / legacy-artifact code (CLAUDE.md). Blueprint is rewritten to the new shape, not upgraded.
- Command emits registry-derived structure only; scene-intent (literal / `$fields.<field>` / `[token]` / which field / which property) is caller-supplied input.
- `debo-test` runs from a **plain checkout, not a git worktree** (setup scripts `git reset --hard` / `git clean -fd`).
- `pnpm check` (typecheck → lint → test) stays green from the monorepo root for the monorepo MR.

---

### Task 1: Clone the module repo and scaffold the submodule (AC-1)

**Files:**
- Prepare clone: `~/projects/drupal-designbook-1x/` ← `git.drupalcode.org/project/designbook.git` (branch off `1.x`)
- Create: `<clone>/modules/designbook_ui_patterns/designbook_ui_patterns.info.yml`
- Create: `<clone>/modules/designbook_ui_patterns/README.md`

**Interfaces:**
- Produces: an installable submodule `designbook_ui_patterns` requiring `ui_patterns` + `sdc`.

- [ ] **Step 1: Clone and branch**

```bash
git clone https://git.drupalcode.org/project/designbook.git ~/projects/drupal-designbook-1x
cd ~/projects/drupal-designbook-1x && git checkout 1.x && git checkout -b DESIGNBOOK-10-ui-patterns
```

- [ ] **Step 2: Create `designbook_ui_patterns.info.yml`**

```yaml
name: 'Designbook UI Patterns'
type: module
description: 'Dev-only: drush introspection of the UI Patterns 2 source-mapping registry (SDC prop type -> source_id, entity_field/field_property blocks, variant_id). Never enable on production.'
core_version_requirement: ^10 || ^11
package: Development
dependencies:
  - ui_patterns:ui_patterns
  - core:sdc
```

- [ ] **Step 3: Create `README.md`** documenting the single command (defer command detail to Task 2; state input/output/exit contract and the dev-only warning).

- [ ] **Step 4: Verify enable in the test workspace** (after Task 5 wires the fixture; ordering note — this step is validated during Task 5's workspace run).

```bash
ddev drush pm:enable designbook_ui_patterns -y && ddev drush pm:list --status=enabled | grep designbook_ui_patterns
```
Expected: module listed as Enabled (AC-1).

- [ ] **Step 5: Commit** (in the clone)

```bash
git add modules/designbook_ui_patterns && git commit -m "feat(designbook_ui_patterns): scaffold submodule (DESIGNBOOK-10)"
```

---

### Task 2: `designbook:ui-pattern` — the whole `ui_patterns` block in one call (AC-2, AC-3, AC-4)

**Files:**
- Create: `<clone>/modules/designbook_ui_patterns/src/Drush/Commands/UiPatternMappingCommands.php`
- Create: `<clone>/modules/designbook_ui_patterns/drush.services.yml`

**Interfaces:**
- Consumes: `plugin.manager.sdc` (`ComponentPluginManager::getDefinition($componentId)`), `plugin.manager.ui_patterns_prop_type` (`guessFromSchema`), `plugin.manager.ui_patterns_source` (`getPropTypeDefault`, `getDefinitionsForPropType`).
- Produces: `designbook:ui-pattern <component_id> --props=<json>` → JSON `{component_id, variant_id, props{}, slots{}}` on stdout. One call resolves every prop — no per-prop loop.

- [ ] **Step 1: Write the full command class**

```php
<?php

declare(strict_types=1);

namespace Drupal\designbook_ui_patterns\Drush\Commands;

use Drupal\Core\Theme\ComponentPluginManager;
use Drupal\ui_patterns\PropTypePluginManager;
use Drupal\ui_patterns\SourcePluginManager;
use Drush\Attributes as CLI;
use Drush\Commands\AutowireTrait;
use Drush\Commands\DrushCommands;

/**
 * Introspects the UI Patterns 2 source-mapping registry for designbook.
 */
final class UiPatternMappingCommands extends DrushCommands {

  use AutowireTrait;

  public function __construct(
    protected ComponentPluginManager $sdcManager,
    protected PropTypePluginManager $propTypeManager,
    protected SourcePluginManager $sourceManager,
  ) {
    parent::__construct();
  }

  /**
   * Returns the whole ui_patterns block for a ComponentNode props/slots input.
   *
   * The --props JSON carries the caller's per-prop scene-intent hint:
   *   {"field": "<et>:<bundle>:<field>[:<property>]"}  -> entity_field block
   *   {"literal": <value>}  (or a bare scalar)         -> scalar source
   *   {"token": "[...]"}                               -> token source
   * The command resolves the deterministic registry half; it never guesses intent.
   */
  #[CLI\Command(name: 'designbook:ui-pattern', aliases: ['dbup'])]
  #[CLI\Argument(name: 'component_id', description: 'SDC id, e.g. mytheme:card.')]
  #[CLI\Option(name: 'props', description: 'JSON of ComponentNode {props{}, slots{}}.')]
  public function uiPattern(string $component_id, array $options = ['props' => '{}']): void {
    $input = json_decode($options['props'] ?? '{}', TRUE) ?: [];
    $definition = $this->sdcManager->getDefinition($component_id);

    $block = [
      'component_id' => $component_id,
      'variant_id' => $this->variantId($definition),
      'slots' => (object) ($input['slots'] ?? []),
      'props' => [],
    ];
    foreach (($input['props'] ?? []) as $prop => $spec) {
      $block['props'][$prop] = $this->resolveProp($definition, $prop, $spec);
    }
    $this->output()->writeln(json_encode($block, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
  }

  /**
   * Resolves one prop to its {source_id, source} block from its intent hint.
   */
  private function resolveProp(array $definition, string $prop, mixed $spec): array {
    // Token intent — fixed source id, no registry lookup.
    if (is_array($spec) && isset($spec['token'])) {
      return ['source_id' => 'token', 'source' => ['value' => $spec['token']]];
    }
    $propSchema = $definition['props']['properties'][$prop]
      ?? throw new \InvalidArgumentException("Unknown prop '$prop' on '{$definition['id']}'.");
    $propType = $this->propTypeManager->guessFromSchema($propSchema);
    $propTypeId = $propType?->getPluginId() ?? 'string';

    // Field intent — entity_field / field_property block from the registry.
    if (is_array($spec) && isset($spec['field'])) {
      return $this->entityFieldBlock($propTypeId, (string) $spec['field']);
    }

    // Literal intent — scalar source id from the prop type default.
    $value = is_array($spec) ? ($spec['literal'] ?? NULL) : $spec;
    $sourceId = $this->sourceManager->getPropTypeDefault($propTypeId) ?? 'textfield';
    return ['source_id' => $sourceId, 'source' => ['value' => $value]];
  }

  /**
   * Builds the entity_field derivable-context block for a field-mapped prop.
   */
  private function entityFieldBlock(string $propTypeId, string $field): array {
    [$et, $bundle, $fieldName, $property] = array_pad(explode(':', $field), 4, NULL);
    $contextKey = "field:$et:$bundle:$fieldName";
    $contexts = ['entity_type' => $et, 'bundle' => $bundle, 'field_name' => $fieldName];
    $valid = $this->sourceManager->getDefinitionsForPropType($propTypeId, $contexts);
    $leafSourceId = $property !== NULL
      ? $this->pickSource($valid, 'field_property')
      : $this->pickSource($valid, 'entity_field');
    return [
      'source_id' => 'entity_field',
      'source' => [
        'derivable_context' => $contextKey,
        $contextKey => ['value' => ['source_id' => $leafSourceId]],
      ],
    ];
  }

  /**
   * Picks a source id from valid definitions, preferring $preferredBase.
   */
  private function pickSource(array $valid, string $preferredBase): string {
    foreach (array_keys($valid) as $id) {
      if ($id === $preferredBase || str_starts_with($id, $preferredBase . ':')) {
        return $id;
      }
    }
    return $preferredBase;
  }

  /**
   * Resolves variant_id: NULL when no variants:, a derived block otherwise.
   */
  private function variantId(array $definition): mixed {
    if (empty($definition['variants'])) {
      return NULL;
    }
    $sourceId = $this->sourceManager->getPropTypeDefault('variant') ?? 'select';
    return ['source_id' => $sourceId, 'source' => ['value' => NULL]];
  }
}
```

- [ ] **Step 2: Register the command class** — create `drush.services.yml` (Drush 13 discovers attribute commands under `src/Drush/Commands`, but declare it explicitly to match the module's existing pattern):

```yaml
services:
  Drupal\designbook_ui_patterns\Drush\Commands\UiPatternMappingCommands:
    tags:
      - { name: drush.command }
```

- [ ] **Step 3: Live assertion — one call, all ACs** (after Task 5 provisions `test_integration_drupal:card` with boolean `published`, enum `size`, string `title`, url `link`, `variants:`, and mapped field `node:article:field_size`; and `test_integration_drupal:plain` with no variants):

```bash
ddev drush designbook:ui-pattern test_integration_drupal:card \
  --props='{"props":{"published":{"literal":true},"size":{"field":"node:article:field_size"},"title":"Hello","link":{"literal":"https://x"}}}'
ddev drush designbook:ui-pattern test_integration_drupal:plain
```
Expected (first call, from the single JSON output):
- `props.published.source_id` = `checkbox`, `props.size.source_id` = `entity_field` with `source.derivable_context` = `field:node:article:field_size`, `props.title.source_id` = `textfield`, `props.link.source_id` = `url` (AC-2 + AC-3);
- `variant_id` is a `{source_id, source}` block (card declares `variants:`) (AC-4).

Expected (second call): `variant_id` = `null`, `component_id` = `test_integration_drupal:plain` (AC-4).

- [ ] **Step 4: Commit** — `feat(designbook_ui_patterns): ui-pattern whole-block command (AC-2..4)`. Push the clone branch and open the drupal.org MR.

---

### Task 5: Fixture wiring — ui_patterns dep + variant component + workspace enable (test enablement, AC-1/AC-4 support)

**Files:**
- Modify: `packages/integrations/drupal-fixture/composer.json` (+ regenerate `composer.lock`)
- Create: `packages/integrations/test-integration-drupal/components/card/card.component.yml` (+ `card.twig`) — an SDC with `variants:` and props boolean/enum/string/url
- Create: `packages/integrations/test-integration-drupal/components/plain/plain.component.yml` (+ `plain.twig`) — no `variants:`
- Modify: `scripts/start-drupal-workspace.sh`
- Modify: `packages/integrations/drupal-fixture/composer.json` `repositories` — add the drupal.org MR branch pointer for pre-merge testing (see Step 4)

**Interfaces:**
- Produces: a workspace where `ui_patterns` + `designbook_ui_patterns` enable and the `card` / `plain` components exist.

- [ ] **Step 1: Add the dependency** — add `"drupal/ui_patterns": "^2"` to the fixture `require`, then `ddev composer update drupal/ui_patterns --with-dependencies` to regenerate the lock.

- [ ] **Step 2: Author the SDC components** — `card.component.yml` declaring `variants:` (≥1) and `props.properties`: `published` (`type: boolean`), `size` (`type: string`, `enum: [...]`), `title` (`type: string`), `link` (`$ref: "ui-patterns://url"`); plus `plain.component.yml` with props but no `variants:`. Minimal `.twig` for each.

- [ ] **Step 3: Wire workspace enable** — in `start-drupal-workspace.sh`, change the enable line to:

```bash
ddev drush pm:enable ui_patterns designbook designbook_ui_patterns -y
```

- [ ] **Step 4: Point the fixture at the module MR branch (pre-merge only)** — since the fixture consumes `drupal/designbook: dev-1.x`, temporarily require the MR branch (e.g. `dev-DESIGNBOOK-10-ui-patterns`) via the existing `git.drupalcode.org/project/designbook.git` VCS repo so the submodule is present before the drupal.org MR merges. Revert to `dev-1.x` once merged.

- [ ] **Step 5: Rebuild + verify** — `./scripts/setup-workspace.sh <name>` then `./scripts/start-drupal-workspace.sh <name>`; confirm Task 1 Step 4 enable + Task 2 Step 3 live assertions pass. Commit fixture changes (monorepo).

---

### Task 6: Thin `ui-patterns.md` + `backend_cmd` command strings (AC-5)

**Files:**
- Modify: `.agents/skills/designbook-drupal/data-mapping/blueprints/ui-patterns.md`
- Modify: `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md`

**Interfaces:**
- Produces: a blueprint that references the drush command for the registry half and keeps only scene-intent prose.

- [ ] **Step 0: Load the authoring skill** — before editing any file under `.agents/skills/designbook-*/`, load `designbook-skill-creator` and the matching per-file-type rule (`rules/blueprint-files.md` + `rules/common-rules.md`). (CLAUDE.md — non-optional.)

- [ ] **Step 1: Add `backend_cmd` command strings** — in `designbook-config.md`'s `backend_cmd` block, add (data-only, mirroring `schema_cmd`/`validate_cmd`):

```yaml
  ui_pattern_cmd: "ddev drush designbook:ui-pattern"   # full ui_patterns block in one call; append <component_id> --props=<json ComponentNode props/slots>
```
Update the `backend_cmd — data for sync task interpolation` prose to document it, noting it is provided by the `designbook_ui_patterns` submodule of `drupal/designbook`.

- [ ] **Step 2: Thin `ui-patterns.md`** — delete the static `source_id` table (the `## props` bullets enumerating boolean→checkbox etc.) and the hand-written `entity_field` / `field_property` config templates. Replace with a short section: "The Drupal-registry half — `source_id` per prop type, the `entity_field`/`field_property` block, and `variant_id` — is emitted by `designbook:ui-pattern <component_id> --props=<json>` (the `designbook_ui_patterns` submodule), in one call. Run the command for the component; do not hand-derive." Keep only scene-intent prose: `component_id` derivation, literal vs `$fields.<field>` vs `[token]` vs attributes, which field, which prop-property, and `slots` placement. Keep the generic reference-shape example as an illustration of the command's output.

- [ ] **Step 3: Validate the blueprint** — run the designbook skill validator over the changed skill files; expect no violations.

- [ ] **Step 4: Commit** (monorepo) — `feat(designbook-10): thin ui-patterns blueprint to scene-intent; reference drush command (AC-5)`.

---

### Task 7: End-to-end verification via `debo-test`

**Files:**
- Use / author: the `debo-test` suite+case whose fixture exercises the Drupal `ui_patterns` data-mapping.

- [ ] **Step 1: Pick or author the case** — from a plain checkout (not a worktree). If no fixture exercises the `ui_patterns` mapping, author one that maps the `card` component (props + a field + variants).

- [ ] **Step 2: Run the tester** — `debo-test run <suite> <case>` for a functional pass (or `debo-test research <suite> <case> --baseline-only` for a scored audit). The tester provisions the workspace + live Drupal via `start-drupal-workspace.sh`.

- [ ] **Step 3: Assert all ACs** — the emitted mapping uses the command output: scalar props (AC-2), `--field` entity_field block (AC-3), `variant_id` null/derived + full block (AC-4), and the thinned blueprint drives the agent to call the command rather than a static table (AC-5).

- [ ] **Step 4: `pnpm check`** — run from the monorepo root (typecheck → lint → test); expect green (monorepo MR touches skills/fixture/scripts).

---

## Self-Review

- **Spec coverage:** AC-1 → Task 1 (+ Task 5 enable); AC-2/AC-3/AC-4 → Task 2 (single whole-block command); AC-5 → Task 6. Fixture/test enablement → Task 5; end-to-end → Task 7. All ACs mapped.
- **Two-repo coordination:** Task 5 Step 4 handles pre-merge testing against the module MR branch; the module MR (Tasks 1–4) and monorepo MR (Tasks 5–7) are called out separately.
- **API consistency:** `resolveProp` / `entityFieldBlock` / `pickSource` / `variantId` are private helpers of the single Task 2 command class. Service ids + method signatures match the verified Global Constraints.
- **Open coding-time check:** the exact `getDefinitionsForPropType` context-array key names (`entity_type`/`bundle`/`field_name`) and the derived leaf source-id string are verified at coding time against the live registry output; adjust `entityFieldBlock` to the actual returned definition keys if they differ.
