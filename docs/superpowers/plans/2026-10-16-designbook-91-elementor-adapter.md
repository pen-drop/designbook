# Elementor Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execution method is already selected (`method:superpowers` coding → executing-plans + TDD).

**Goal:** Make Designbook components editable as Elementor Free 4.3.5 classic widgets (including fixed named slots) and sync a screen scene to an Elementor page that renders through the same Twig as Storybook.

**Architecture:** A generated `<ns>-elementor` plugin subscribes to `designbook/register_components`, registers one widget per `ComponentRegistry::ui()` definition (leaf = `Widget_Base`, slots = `Widget_Nested_Base`), and renders via `ComponentRegistry::render()`. Sync writes one `layout.<scene>` PHP seed that upserts `_elementor_data` by `_designbook_id`. Mapping/document PHP in the skill templates is WordPress-free so contract tests run with `php -d zend.assertions=1`.

**Tech Stack:** PHP 8.3, Elementor Free 4.3.5 (classic editor, Nested Elements), Timber 2, WordPress 6.8+/fixture 7.1.3, DDEV, debo-test `wordpress-recipe`.

**Spec:** GAIA spec comment `11ef3256-3560-4c69-ac05-32bf238bf3e3` (confirmed 2026-10-16). Parent contract: `.agents/skills/designbook-wordpress/sync/rules/builder-adapter-contract.md`.

## Global Constraints

- Elementor Free **4.3.5** only. Pin the fixture artifact; never install `latest`. No Elementor Pro.
- Reuse `ComponentRegistry.php` unchanged. Adapters read definitions only from the registry.
- No migrations or legacy-artifact repair.
- Load `designbook-skill-creator` (plus the matching per-file-type rule, `common-rules.md`, `writing-files.md`) before any guarded skill edit. Load `debo-test` before behavior verification.
- Preserve the pre-existing worktree `pnpm-lock.yaml` modification; leave it unstaged.
- Commit messages: conventional type, no GAIA id in the subject, last line `ref:DESIGNBOOK-91`.
- Run `pnpm check` before every commit that touches JS/TS/repo checks. PHP contract tests run with `php -d zend.assertions=1 -d assert.exception=1`.
- DDEV project names stay workspace-scoped (`designbook-wp-<key>`). Never `ddev poweroff`.
- Transient evidence under `assets-ai/DESIGNBOOK-91/`.
- Widget name: `db_<ns>_<id>` (Elementor `get_name()`: lowercase `[a-z0-9_-]`).
- One unit writes exactly one file. Adapter plugin files live under `plugins/<ns>-elementor/`.

## Review Focus

- Nested slot containers that Elementor's repeater would add/remove — editors keep schema-defined regions only; empty slots remain after save/reopen.
- Elementor URL-control objects and switch `true`/`false` strings decoded before Twig, so `false`/`0`/empty string are not replaced by defaults.
- Scene seed failure leaves the previous `_elementor_data` in place (no partial new page).
- Kit token merge preserves unrelated kit entries and never replaces the whole kit.
- Editor iframe and public HTML share the same component classes, slot order, and WordPress-served image URLs (no Storybook-host URLs).

---

### Task 1: Pin Elementor Free 4.3.5 in the WordPress fixture

**Files:**
- Modify: `packages/integrations/wordpress-fixture/composer.json`
- Modify: `packages/integrations/wordpress-fixture/composer.lock` (via `ddev composer require`)
- Modify: `scripts/prepare-wordpress-fixture.sh` (presence check includes `wp-content/plugins/elementor`)
- Modify: `scripts/start-wordpress-workspace.sh` (activate `elementor` after SCF)
- Modify: `packages/integrations/wordpress-fixture/README.md`
- Create: `packages/integrations/wordpress-fixture/ELEMENTOR.md`

**Interfaces:**
- Consumes: existing fixture Composer/wpackagist layout
- Produces: `wpackagist-plugin/elementor` locked at `4.3.5`; plugin directory present after prepare; `ddev wp plugin is-active elementor` after start

- [ ] **Step 1: Write the failing pin check**

Create `packages/integrations/wordpress-fixture/tests/elementor-pin-test.php`:

```php
<?php
$plugin = WP_PLUGIN_DIR . '/elementor/elementor.php';
assert(is_file($plugin), 'elementor plugin file exists');
$data = get_plugin_data($plugin, false, false);
assert($data['Version'] === '4.3.5', 'pinned version 4.3.5, got ' . $data['Version']);
assert(!is_plugin_active('elementor-pro/elementor-pro.php'), 'Elementor Pro is absent');
echo "OK\n";
```

- [ ] **Step 2: Run it on a started wordpress workspace**

```bash
# after start-wordpress-workspace.sh --workspace <ws>
ddev wp eval-file tests/elementor-pin-test.php
```

Expected: FAIL — plugin missing or not 4.3.5.

- [ ] **Step 3: Pin and activate**

In `composer.json` require `"wpackagist-plugin/elementor": "4.3.5"`. From the fixture DDEV project run `ddev composer update wpackagist-plugin/elementor --with-dependencies --no-interaction` so `composer.lock` records 4.3.5. Extend `prepare-wordpress-fixture.sh` so the skip-if-present check also requires `wp-content/plugins/elementor`. In `start-wordpress-workspace.sh` after SCF: `ddev wp plugin activate elementor`. Document the pin, GPL v3-or-later, classic-editor boundary, Nested Elements internal-API risk, and “upgrade = fresh fixture run” in `ELEMENTOR.md`.

- [ ] **Step 4: Re-run pin test**

Expected: `OK`. Confirm ZIP/plugin header version is 4.3.5, not 4.4.0.

- [ ] **Step 5: Commit**

```bash
git add packages/integrations/wordpress-fixture scripts/prepare-wordpress-fixture.sh scripts/start-wordpress-workspace.sh
git commit -m "$(cat <<'EOF'
feat: pin Elementor Free 4.3.5 in the WordPress fixture

ref:DESIGNBOOK-91
EOF
)"
```

Leave `pnpm-lock.yaml` unstaged.

---

### Task 2: Schema → controls, decode, and validate (no WordPress)

**Files:**
- Create: `.agents/skills/designbook-wordpress/sync/templates/elementor/src/Controls.php`
- Create: `packages/integrations/wordpress-fixture/tests/elementor-controls-test.php`

**Interfaces:**
- Consumes: a component `props` JSON Schema array (`type`, `properties`, `required`, `default`)
- Produces:
  - `Designbook\Elementor\Controls::map(array $schema): array` — list of `['id' => string, 'type' => 'text'|'url'|'switcher'|'number'|'select'|'textarea', 'label' => string, 'options'?: array, 'default'?: mixed, 'required'?: bool]`
  - `Designbook\Elementor\Controls::decode(array $settings, array $schema): array` — props for Twig
  - `Designbook\Elementor\Controls::validate(array $props, array $schema): void` throws `\InvalidArgumentException` on bad input

Unsupported schema constructs (`oneOf`, `$ref`, `not`, unknown `type`) throw with the prop id in the message. JSON-object/array props map to `textarea` and must parse as JSON matching the declared schema.

- [ ] **Step 1: Write the failing test** `elementor-controls-test.php`

```php
<?php
require $argv[1]; // path to Controls.php
use Designbook\Elementor\Controls;

$schema = [
  'type' => 'object',
  'required' => ['title'],
  'properties' => [
    'title' => ['type' => 'string', 'title' => 'Title'],
    'featured' => ['type' => 'boolean', 'default' => false],
    'count' => ['type' => 'integer', 'default' => 0],
    'href' => ['type' => 'string', 'format' => 'uri'],
    'tone' => ['type' => 'string', 'enum' => ['quiet', 'loud']],
    'meta' => ['type' => 'object'],
  ],
];
$controls = Controls::map($schema);
$byId = array_column($controls, null, 'id');
assert($byId['title']['type'] === 'text');
assert($byId['featured']['type'] === 'switcher');
assert($byId['count']['type'] === 'number');
assert($byId['href']['type'] === 'url');
assert($byId['tone']['type'] === 'select' && $byId['tone']['options'] === ['quiet' => 'quiet', 'loud' => 'loud']);
assert($byId['meta']['type'] === 'textarea');

$decoded = Controls::decode([
  'title' => 'Hello',
  'featured' => '',          // Elementor switcher off
  'count' => '0',
  'href' => ['url' => 'https://example.com', 'is_external' => ''],
  'tone' => 'quiet',
  'meta' => '{"a":1}',
], $schema);
assert($decoded['featured'] === false);
assert($decoded['count'] === 0);
assert($decoded['href'] === 'https://example.com');
assert($decoded['meta'] === ['a' => 1]);

try { Controls::validate(['featured' => false], $schema); assert(false, 'missing title'); }
catch (InvalidArgumentException $e) { assert(str_contains($e->getMessage(), 'title')); }

try { Controls::validate(['title' => 'x', 'href' => 'javascript:alert(1)'], $schema); assert(false, 'bad uri'); }
catch (InvalidArgumentException $e) { assert(str_contains($e->getMessage(), 'href')); }

try { Controls::map(['properties' => ['x' => ['oneOf' => []]]]); assert(false, 'unsupported'); }
catch (InvalidArgumentException $e) { assert(str_contains($e->getMessage(), 'x')); }

echo "OK\n";
```

- [ ] **Step 2: Run to verify it fails**

```bash
php -d zend.assertions=1 -d assert.exception=1 packages/integrations/wordpress-fixture/tests/elementor-controls-test.php \
  .agents/skills/designbook-wordpress/sync/templates/elementor/src/Controls.php
```

Expected: FAIL — file/class missing.

- [ ] **Step 3: Implement `Controls.php`**

`map`: enum→select, boolean→switcher, `format: uri`→url, string→text, integer/number→number, object/array→textarea. Preserve `required` and `default`. `decode`: switcher `''`/`'false'`/`null` → `false`, `'yes'`/`'true'`/`'1'` → `true`; URL array uses `url`; numeric strings cast; textarea JSON decoded. `validate`: required present (including `false`/`0`/`''`), types, enum, URI schemes `http`/`https`/`/`/`#` only, no unexpected keys, JSON matches schema. Defaults apply only when the key is absent.

- [ ] **Step 4: Run test** Expected: `OK`.

- [ ] **Step 5: Commit** `feat: map component schemas to Elementor controls` + `ref:DESIGNBOOK-91`.

---

### Task 3: Scene tree → `_elementor_data` document

**Files:**
- Create: `.agents/skills/designbook-wordpress/sync/templates/elementor/src/Document.php`
- Create: `packages/integrations/wordpress-fixture/tests/elementor-document-test.php`

**Interfaces:**
- Consumes: a scene `items` tree (`component`, `props`, `slots`), plus `ui()` definitions (id, slots, ui flag)
- Produces: `Designbook\Elementor\Document::fromScene(array $items, array $definitions, string $namespace): array` — Elementor elements list. Deterministic `id` from `sha1(path)[0:7]`. Widget `widgetType` = `db_<ns>_<id>`. Each declared slot is one child `container` with `settings.designbook_slot` = slot key and `settings._title` = slot title. Element/image nodes keep attributes/content (no drop/flatten). Unknown component, `ui: false` used as a palette node, unknown slot name, or duplicate `_designbook_id` input throw. `fromScene` does not write WordPress.

- [ ] **Step 1: Write the failing test** covering two named slots, empty slot, nested slot, leaf props, image node `src` kept, unknown component error, unknown slot error.

- [ ] **Step 2: Run** Expected: FAIL — class missing.

- [ ] **Step 3: Implement `Document.php`.** Recursive walk. Slot containers use `elType: container`, `isInner: true`. Child widgets go inside the matching slot container. Empty slots still emit the container with `elements: []`.

- [ ] **Step 4: Run** Expected: `OK`.

- [ ] **Step 5: Commit** `feat: write Elementor documents from scene trees` + `ref:DESIGNBOOK-91`.

---

### Task 4: Adapter plugin widgets, nested slots, render

**Files:**
- Create: `.agents/skills/designbook-wordpress/sync/templates/elementor/<ns>-elementor.php` as `plugin.php` with `__NAMESPACE__` placeholder
- Create: `.agents/skills/designbook-wordpress/sync/templates/elementor/src/Plugin.php`
- Create: `.agents/skills/designbook-wordpress/sync/templates/elementor/src/LeafWidget.php`
- Create: `.agents/skills/designbook-wordpress/sync/templates/elementor/src/NestedWidget.php`
- Create: `.agents/skills/designbook-wordpress/sync/templates/elementor/assets/editor.js`
- Create: `packages/integrations/wordpress-fixture/tests/elementor-adapter-test.php`

**Interfaces:**
- Consumes: `do_action('designbook/register_components', $registry)` at `init` 20; Elementor widgets_manager
- Produces: one registered widget per `ui()` definition; `ui: false` omitted from palette but still renderable via registry; `render()` calls `ComponentRegistry::render($id, $props, $slots)` with child HTML keyed by original slot names; style/advanced controls removed on adapter widgets and slot containers; missing Elementor / version ≠ 4.3.5 / Nested Elements unavailable → admin notice + no registration + no fatal

Widget classes are two shared PHP classes. Registration builds one instance per definition (anonymous subclass or constructor-injected definition) so `get_name()` / `get_title()` / `get_categories()` / slot list differ. Category uses definition `group` when set, else `designbook`.

Nested widgets: `Widget_Nested_Base`. `get_default_children()` returns exactly the schema slots. Editor JS registers a nested model/view that:
- mounts child views into `[data-slot="<key>"]` placeholders in the server-rendered markup (no duplicated Twig in JS)
- rejects adding/removing/renaming the schema slot containers
- allows insert/reorder/move/remove of child widgets inside those containers

Preview iframe enqueues the same compiled theme `css/app.css`.

- [ ] **Step 1: Write `elementor-adapter-test.php`** (wp eval-file). Fixture temp components: `card` (leaf, required title), `stack` (slots `media` + `body`), `icon` (`ui: false`). Assert:
  - `ui()` widgets registered, `icon` not in palette
  - `card` control `title` exists; no `color`/`padding`/`typography` controls on adapter widgets
  - render of `card` with title matches Timber output of the same Twig
  - render of `stack` with media/body HTML preserves order
  - `ComponentRegistry` is the only `*.schema.yml` reader (adapter PHP has no `schema.yml` glob)
  - version helper returns the refusal reason when `ELEMENTOR_VERSION` is stubbed to `4.4.0`

- [ ] **Step 2: Run on DDEV** Expected: FAIL — plugin/classes missing.

- [ ] **Step 3: Implement plugin templates.** Diagnostics run before `widgets_manager->register`. Shared mapping uses Task 2 `Controls`. Nested `render()`: for each slot, capture `ob_start(); $this->print_children($index);`, then `registry->render`. Escape: pass decoded props through; templates already `|e`.

- [ ] **Step 4: Run adapter test** Expected: `OK`.

- [ ] **Step 5: Commit** `feat: register Designbook components as Elementor widgets` + `ref:DESIGNBOOK-91`.

---

### Task 5: Page upsert, tokens, and shell-once template

**Files:**
- Create: `.agents/skills/designbook-wordpress/sync/templates/elementor/src/Seed.php`
- Create: `.agents/skills/designbook-wordpress/sync/templates/elementor/src/Tokens.php`
- Create: `.agents/skills/designbook-wordpress/sync/templates/elementor/page-template.php`
- Create: `packages/integrations/wordpress-fixture/tests/elementor-seed-test.php`

**Interfaces:**
- `Seed::upsert(string $designbookId, array $elements, array $images = []): int` — find page by post meta `_designbook_id`; create if missing; save through Elementor document API for 4.3.5 (`documents->get($id)->save(['settings' => ['post_status' => 'publish'], 'elements' => $elements])`); set `_elementor_edit_mode` = `builder`, `_elementor_template_type` = `wp-page`, `_elementor_version` = `4.3.5`; flush CSS cache. On save failure throw and leave the previous document. Duplicate `_designbook_id` among existing posts throws before write. Local image paths become attachment URLs (never Storybook hosts). Returns post ID.
- `Tokens::mirrorKit(array $palette, array $fontFamilies): void` — namespaced custom entries (`designbook-<slug>`) into the active kit; preserve unrelated entries; skip non-color / non-font-family tokens.
- Page template renders `wp_head`, designbook header part, `the_content()` (Elementor), footer part, `wp_footer`. No extra `the_title()`, no second shell.

- [ ] **Step 1: Write seed test** — upsert, re-upsert same id (one page, stable node ids), unrelated page preserved, invalid widget type does not replace a good page, kit merge keeps a pre-existing custom color.

- [ ] **Step 2: Run** Expected: FAIL.

- [ ] **Step 3: Implement Seed/Tokens/page-template.** Resolve images via `media_handle_sideload` / existing attachment by `_designbook_id` on the attachment.

- [ ] **Step 4: Run** Expected: `OK`.

- [ ] **Step 5: Commit** `feat: seed Elementor pages and mirror design tokens into the kit` + `ref:DESIGNBOOK-91`.

---

### Task 6: Skill units, blueprints, and generated plugin copy

**Files:**
- Modify: `.agents/skills/designbook-wordpress/sync/rules/sync-units.md`
- Create: `.agents/skills/designbook-wordpress/sync/blueprints/elementor-plugin.md`
- Create: `.agents/skills/designbook-wordpress/sync/blueprints/elementor-layout.md`
- Modify: `.agents/skills/designbook-wordpress/install/blueprints/designbook-config.md` (`entity_mapping.templates` includes `elementor`; import also activates `<ns>-elementor`)
- Modify: `.agents/skills/designbook-wordpress/SKILL.md` (index links only)
- Modify: `.agents/skills/designbook-wordpress/sync/rules/builder-adapter-contract.md` only if a constraint is missing (keep ADAPT-01..05)

**Interfaces:**
- When `entity_mapping.templates` contains `elementor`, intake also emits:
  - `plugin.<ns>_elementor` → `plugins/<ns>-elementor/<ns>-elementor.php`
  - `plugin.<ns>_elementor.src.<file>` one unit per copied PHP/JS file under `src/` and `assets/`
  - `template.<ns>.elementor_page` → `themes/<ns>/elementor-designbook.php`
- When `scene` is set and the page bundle full view-mode `template` is `elementor`, append `layout.<scene>` → `plugins/<ns>-elementor/seeds/<scene>.php` with `build_form: elementor`.
- Blueprint `elementor-plugin` (`trigger.config_name: 'plugin.*_elementor*'`): copy templates, substitute `__NAMESPACE__`.
- Blueprint `elementor-layout` (`trigger.config_name: 'layout.*'`): emit a seed script that loads the scene payload, calls `Document::fromScene`, `Seed::upsert`, `Tokens::mirrorKit`, prints the page URL. `import` activates both content and elementor plugins.

Load `designbook-skill-creator` + `rules/rule-files.md` / `blueprint-files.md` / `common-rules.md` / `writing-files.md` before each guarded edit. Rules stay constraints (WHAT). Blueprints hold PHP/JS examples (HOW). No `provides:`/`constrains:` on blueprints. No rule `params:`.

- [ ] **Step 1: Author the rule/blueprint files.**
- [ ] **Step 2: Validate skill files** with the skill-creator validator (`resources/validate.md` command).
- [ ] **Step 3: `pnpm check`**.
- [ ] **Step 4: Commit** `feat: generate the Elementor adapter plugin and scene seed units` + `ref:DESIGNBOOK-91`.

---

### Task 7: Fixture layer and debo-test cases

**Files:**
- Create: `fixtures/wordpress-recipe/elementor/` (components `stack` with slots `media`+`body`, `heading` leaf, `icon` with `ui: false`; overlay `designbook.config.yml` adding `entity_mapping.templates: [field-map, elementor]`; `post.page` full `template: elementor`; scene `recipes-home` with two slots, nested child, empty slot, image node; section scenes file)
- Create: `fixtures/wordpress-recipe/cases/elementor.yaml`
- Create: `fixtures/wordpress-recipe/cases/sync-elementor.yaml`
- Modify: `promptfoo/providers/cli-provider.mjs` so wordpress cases named `elementor` or `sync-*` provision DDEV (`/^(sync|seed|elementor)(-|$)/`)

**Interfaces:**
- `elementor` case: layers `empty, reference, vision, data-model, tokens, screen, elementor`. Prompt: run `/debo sync-to` empty filter (no scene). Assert generated `plugins/test_integration_wordpress-elementor/` files, widget PHP contains `ComponentRegistry::render` and no `schema.yml` glob, `ddev wp eval-file tests/elementor-adapter-test.php` output `OK`.
- `sync-elementor` case: same layers. Prompt: run `/debo sync-to` **with scene `recipes-home`**. Assert `layout.recipes-home` seed exists, `seed_cmd` creates one page with `_designbook_id=recipes-home`, re-run keeps one page, unrelated pages remain, frontend HTML contains stack/heading markup and a WordPress uploads URL for the image.

- [ ] **Step 1: Write fixture components + scene + cases** (assertions first).
- [ ] **Step 2: Load `debo-test` and run**

```bash
debo-test run wordpress-recipe elementor --workspace /tmp/db91-elementor
debo-test run wordpress-recipe sync-elementor --workspace /tmp/db91-sync-elementor
```

Expected first run: FAIL (units/plugin not generated by the worker until Task 6 skills exist — this task assumes Task 6 is done). Fix fixtures/skills until both pass.

- [ ] **Step 3: Agent Playwright (coding run, not debo-test)** against the sync-elementor workspace: log in as `admin`/`admin`, open the page in Elementor, insert/edit mapped props, nest two slots, save/reopen, compare editor iframe vs anonymous frontend at 1280 and 375. Store screenshots under `assets-ai/DESIGNBOOK-91/playwright/`.

- [ ] **Step 4: Commit** `test: add wordpress-recipe Elementor adapter cases` + `ref:DESIGNBOOK-91`. Commit `promptfoo/results.csv` if the runner appends rows.

---

### Task 8: AC-4 documentation and static adapter-boundary check

**Files:**
- Already created: `packages/integrations/wordpress-fixture/ELEMENTOR.md`
- Create: `packages/integrations/wordpress-fixture/tests/elementor-boundary-test.php` (or extend adapter test)
- Modify: `.agents/skills/designbook-wordpress/SKILL.md` index pointer to ELEMENTOR.md / elementor blueprints

- [ ] **Step 1: Failing grep/assert** that adapter templates contain no `glob(...schema.yml)` and no direct `components/` directory scan; they reference `ComponentRegistry` only.
- [ ] **Step 2: Run** Expected: FAIL if any bypass remains.
- [ ] **Step 3: Fix any bypass. Document supported version, classic-editor only, Nested Elements internal API, Pro absent, upgrade = new fixture run.**
- [ ] **Step 4: `pnpm check` + PHP tests + both debo-test cases still pass.**
- [ ] **Step 5: Commit** `docs: record the Elementor 4.3.5 adapter support boundary` + `ref:DESIGNBOOK-91`.

---

## Spec coverage

| Spec section | Task |
|---|---|
| Free 4.3.5 pin, no Pro, diagnostics | 1, 4, 8 |
| Widget per `ui()`, groups, registry-only | 4, 6, 8 |
| Schema controls, decode, validate | 2 |
| Fixed named slots, nested render | 3, 4 |
| Scene writer, `_elementor_data`, upsert, images | 3, 5, 7 |
| Tokens kit mirror | 5 |
| Page template + shell once | 5 |
| Skill units/blueprints | 6 |
| `elementor` + `sync-elementor` cases | 7 |
| AC-4 docs + static boundary | 8 |
