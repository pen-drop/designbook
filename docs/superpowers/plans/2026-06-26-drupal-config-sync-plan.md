# Drupal Config Sync — Implementation Plan (Plan 1 of 5: sync-to data-model, structural)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `debo sync-to data-model` writes a filtered Designbook data-model's *structural* config (bundles + fields + config-entities like views/image-styles) into a live Drupal site's config-sync dir and applies it with `drush config:import --partial`.

**Architecture:** A thin new `designbook/sync/` orchestration concern (workflows + tasks, no new domain schema/rules) drives static `to_drupal` JSONata expressions that live inside the existing `designbook-drupal/data-model/` blueprints. A shared `field-types.md` blueprint serializes one field ⇄ `field.storage`/`field.field` and extends the `DataModel` schema in-place. Transforms run via the existing `npx jsonata-w transform` CLI (same mechanism as `generate-jsonata` → `generate-css`). A small addon resolver locates the config-sync dir.

**Tech Stack:** Designbook skill files (YAML frontmatter + Markdown), JSONata (`jsonata-w` CLI), TypeScript addon (`packages/storybook-addon-designbook`, vitest), Drupal `drush`.

## Global Constraints

- **Skill-authoring gate:** Before creating OR editing ANY file under `.agents/skills/designbook/`, `.agents/skills/designbook-*/` (tasks/rules/blueprints/workflows/schemas.yml), you MUST load `designbook-skill-creator` first (CLAUDE.md). Every skill-file task below implicitly starts with this.
- **No compat code:** never write migration/backwards-compat. On-disk artifacts are disposable; test from scratch (CLAUDE.md).
- **`pnpm check` before commit:** typecheck → lint → test (fail-fast). Auto-fix: `pnpm --filter storybook-addon-designbook lint:fix`.
- **Schema-first:** maximize schema enforcement (enums, per-type required settings, output validators) via `provides`/`constrains` + `validators:`, over imperative rules.
- **`.claude/skills/` is a symlink to `.agents/skills/`** — edit only `.agents/skills/`.
- **Reuse, don't duplicate:** the data-model/data-mapping schemas, entity-type/field/mapping blueprints and rules already exist — extend in place, never restate.
- **Touch component/skill files after creation** to defeat the Storybook watcher race (CLAUDE.md / memory).

---

## Plan Split (roadmap)

This plan is **Plan 1 of 5**. Each is independently shippable/testable. Later plans get their own `docs/superpowers/plans/` doc, written when reached.

1. **sync-to data-model (structural)** — THIS PLAN. bundles + fields + config-entities → Drupal config + cim. Displays excluded.
2. **sync-from data-model** — `read-drupal` + `merge` + `from_drupal` reverse on the same blueprints + `field-types` reverse. Round-trip testable.
3. **displays + strategy skills** — data-mapping `to_drupal`/`from_drupal` (native LB/views/canvas) + `designbook-ui-patterns` + `designbook-display-builder` (field-map ⇄ Display Builder). Adds the `view_modes` slice.
4. **content-data** — `data.yml` ⇄ content entities (`sync-to`/`sync-from content-data`).
5. **sync-verify** — verify workflow + `capture-drupal` + fix loop. Resolve the OPEN per-view-mode render-URL mechanism first (contrib module vs minimal preview route).

Plan 1 deliberately scopes to the structural data-model so it ships without the strategy skills.

---

## File Structure (Plan 1)

- Create: `.agents/skills/designbook/sync/workflows/sync-to.md` — the workflow.
- Create: `.agents/skills/designbook/sync/tasks/intake.md`, `resolve-filter.md`, `resolve-deps.md`, `transform.md`, `write-config.md`, `sync.md`, `outtake.md`.
- Create: `.agents/skills/designbook/sync/schemas.yml` — ONLY the Drupal-config output schema (`DrupalConfigEntity`) used as a validator; reuses `DataModel` for input.
- Create: `.agents/skills/designbook-drupal/data-model/blueprints/field-types.md` — shared field serialization + schema extension.
- Modify: `.agents/skills/designbook-drupal/data-model/blueprints/node.md` — add `to_drupal` (calls field-types).
- Modify: `.agents/skills/designbook-drupal/data-model/blueprints/view.md`, `media.md`, `block_content.md`, `taxonomy_term.md` — add `to_drupal`.
- Create: `.agents/skills/designbook-drupal/data-model/rules/drupal-config.md` — emission invariants not expressible as schema (field.storage dedup across bundles, dependency computation note).
- Create: `packages/storybook-addon-designbook/src/resolvers/config-sync-dir.ts` + register in `resolvers/registry.ts`.
- Create: `packages/storybook-addon-designbook/src/resolvers/__tests__/config-sync-dir.test.ts`.
- Create: `packages/storybook-addon-designbook/src/sync/deps-closure.ts` + `__tests__/deps-closure.test.ts` — dependency-closure resolver (pure TS).
- Create: `packages/storybook-addon-designbook/src/sync/__tests__/to-drupal-expressions.test.ts` — JSONata expression tests (fixtures → expected Drupal config).

---

## Task 1: Config-sync-dir resolver (addon)

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/config-sync-dir.ts`
- Modify: `packages/storybook-addon-designbook/src/resolvers/registry.ts`
- Test: `packages/storybook-addon-designbook/src/resolvers/__tests__/config-sync-dir.test.ts`

**Interfaces:**
- Consumes: the Drupal docroot resolution already used by the install skill (read how `reference-folder.ts` / existing resolvers obtain paths from config; follow that pattern).
- Produces: a resolver registered under the name `config_sync_dir` returning an absolute path string. Workflow params reference it via `resolve: config_sync_dir`.

- [ ] **Step 1: Read the existing resolver pattern**

Read `packages/storybook-addon-designbook/src/resolvers/registry.ts` and one existing resolver (`reference-folder.ts`) to learn the exact registration signature and return contract. Do not invent a new shape.

- [ ] **Step 2: Write the failing test**

```ts
// config-sync-dir.test.ts
import { describe, it, expect } from 'vitest';
import { resolveConfigSyncDir } from '../config-sync-dir';

describe('resolveConfigSyncDir', () => {
  it('returns settings $config_directories[sync] resolved against docroot', () => {
    const dir = resolveConfigSyncDir({ docroot: '/srv/app/web', syncRelative: '../config/sync' });
    expect(dir).toBe('/srv/app/config/sync');
  });

  it('falls back to <docroot>/sites/default/files/config_*/sync when unset', () => {
    const dir = resolveConfigSyncDir({ docroot: '/srv/app/web', syncRelative: null });
    expect(dir).toMatch(/\/sites\/default\/.*\/sync$/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test config-sync-dir`
Expected: FAIL — `resolveConfigSyncDir` not exported.

- [ ] **Step 4: Implement the resolver**

Implement `resolveConfigSyncDir({docroot, syncRelative})` performing path normalization against `docroot`; the fallback path matches Drupal's default. Register it in `registry.ts` under `config_sync_dir` following the pattern from Step 1.

- [ ] **Step 5: Run tests + check**

Run: `pnpm --filter storybook-addon-designbook test config-sync-dir`
Expected: PASS. Then `pnpm check`.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/config-sync-dir.ts packages/storybook-addon-designbook/src/resolvers/registry.ts packages/storybook-addon-designbook/src/resolvers/__tests__/config-sync-dir.test.ts
git commit -m "feat(sync): config-sync-dir resolver"
```

---

## Task 2: Drupal-config output schema

**Files:**
- Create: `.agents/skills/designbook/sync/schemas.yml`

**Interfaces:**
- Produces: `DrupalConfigEntity` — the shape every `to_drupal` array item must satisfy. Used by Task 5's `transform` result `validators` and by Task 3/8 expression tests.

- [ ] **Step 1: Load skill-creator**

Invoke `designbook-skill-creator`; read `rules/schema-files.md` + `rules/common-rules.md`.

- [ ] **Step 2: Write the schema**

```yaml
# designbook/sync/schemas.yml
DrupalConfigEntity:
  type: object
  required: [config_name, data]
  properties:
    config_name:
      type: string
      description: Drupal config object name, e.g. node.type.article or field.storage.node.field_body
      pattern: '^[a-z0-9_]+(\.[a-z0-9_]+)+$'
    data:
      type: object
      required: [langcode, status, dependencies]
      properties:
        langcode: { type: string }
        status: { type: boolean }
        dependencies: { type: object, additionalProperties: true }
      additionalProperties: true
  additionalProperties: false

DrupalConfigSet:
  type: array
  items: { $ref: '#/DrupalConfigEntity' }
```

- [ ] **Step 3: Validate skill files**

Run the skill-creator validator over the new file (per `designbook-skill-creator/resources/validate.md`). Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/sync/schemas.yml
git commit -m "feat(sync): DrupalConfigEntity output schema"
```

---

## Task 3: field-types blueprint (schema extension + to_drupal)

**Files:**
- Create: `.agents/skills/designbook-drupal/data-model/blueprints/field-types.md`
- Test: `packages/storybook-addon-designbook/src/sync/__tests__/to-drupal-expressions.test.ts`

**Interfaces:**
- Consumes: a field object from `data-model.yml` `content.<et>.<bundle>.fields.<name>` (`type`, `required`, `multiple`, `settings`).
- Produces: a JSONata fragment `$fieldToStorage(et, fieldName, field)` and `$fieldToInstance(et, bundle, fieldName, field)` returning `DrupalConfigEntity` objects. Entity-type blueprints (Task 4-adjacent) call these. Also `provides` per-type settings sub-schema on `DataModel`.

- [ ] **Step 1: Load skill-creator**

Invoke `designbook-skill-creator`; read `rules/blueprint-files.md`, `rules/schema-files.md`, `rules/common-rules.md`. Read the existing `designbook-drupal/data-model/blueprints/node.md` for frontmatter conventions.

- [ ] **Step 2: Write the failing expression test**

```ts
// to-drupal-expressions.test.ts
import { describe, it, expect } from 'vitest';
import { runJsonata } from './helpers'; // thin wrapper over jsonata-w / addon runtime — see Step 3

const FIELD_TYPES = '…load expression from field-types.md…';

describe('field-types to_drupal', () => {
  it('string field → field.storage + field.field', async () => {
    const out = await runJsonata(FIELD_TYPES, {
      et: 'node', bundle: 'article', name: 'field_subtitle',
      field: { type: 'string', required: false },
    });
    expect(out).toContainEqual(expect.objectContaining({
      config_name: 'field.storage.node.field_subtitle',
      data: expect.objectContaining({ type: 'string', dependencies: expect.any(Object) }),
    }));
    expect(out).toContainEqual(expect.objectContaining({
      config_name: 'field.field.node.article.field_subtitle',
    }));
  });

  it('image field requires image_style and emits image type', async () => {
    const out = await runJsonata(FIELD_TYPES, {
      et: 'node', bundle: 'article', name: 'field_hero',
      field: { type: 'image', settings: { image_style: 'hero' } },
    });
    expect(out).toContainEqual(expect.objectContaining({
      config_name: 'field.storage.node.field_hero',
      data: expect.objectContaining({ type: 'image' }),
    }));
  });
});
```

- [ ] **Step 3: Add the jsonata test helper**

Create `packages/storybook-addon-designbook/src/sync/__tests__/helpers.ts` exporting `runJsonata(expr, input)` that evaluates a JSONata string against input using the SAME library the addon/`jsonata-w` uses (check `expression-cache.ts` for the import). Also export a loader that extracts the named ```jsonata block from a blueprint `.md` so tests run the real expression.

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test to-drupal-expressions`
Expected: FAIL — blueprint/expression missing.

- [ ] **Step 5: Write field-types.md**

Frontmatter: `type: field-types`, `priority`, `trigger: { domain: data-model }`, `filter: { backend: drupal }`, plus `provides:` extending `DataModel` `content.*.*.fields.*.settings` per type (image→`image_style` required; reference→`target_type` required) and constraining `fields.*.type` to the enum `[string, text, text_with_summary, formatted_text, integer, boolean, link, image, reference, ...]`.

Body: a ```jsonata block defining `$fieldToStorage` / `$fieldToInstance` returning `DrupalConfigEntity[]`, computing `dependencies` (module per field type) and `langcode: 'en'`, `status: true`. Mostly identity mapping with image/reference special cases.

- [ ] **Step 6: Run test + validators**

Run: `pnpm --filter storybook-addon-designbook test to-drupal-expressions` → PASS.
Run skill-creator validator over `field-types.md` → no errors.
Run `pnpm check`.

- [ ] **Step 7: Touch + commit**

```bash
touch .agents/skills/designbook-drupal/data-model/blueprints/field-types.md
git add .agents/skills/designbook-drupal/data-model/blueprints/field-types.md packages/storybook-addon-designbook/src/sync/__tests__/
git commit -m "feat(sync): field-types blueprint (field serialization + schema extension)"
```

---

## Task 4: node entity-type to_drupal

**Files:**
- Modify: `.agents/skills/designbook-drupal/data-model/blueprints/node.md`
- Create: `.agents/skills/designbook-drupal/data-model/rules/drupal-config.md`
- Test: append to `to-drupal-expressions.test.ts`

**Interfaces:**
- Consumes: `content.node.<bundle>` (purpose, fields) + `$fieldToStorage`/`$fieldToInstance` from Task 3.
- Produces: a `to_drupal` ```jsonata block emitting `node.type.<bundle>` + every field's storage/instance config as `DrupalConfigEntity[]`.

- [ ] **Step 1: Load skill-creator** (blueprint + rule rules).

- [ ] **Step 2: Write the failing test**

```ts
it('node bundle → node.type + field config', async () => {
  const NODE = loadJsonata('designbook-drupal/data-model/blueprints/node.md', 'to_drupal');
  const out = await runJsonata(NODE, {
    bundle: 'article',
    def: { fields: { field_body: { type: 'text_with_summary' } } },
  });
  expect(out).toContainEqual(expect.objectContaining({ config_name: 'node.type.article' }));
  expect(out).toContainEqual(expect.objectContaining({ config_name: 'field.field.node.article.field_body' }));
});
```

- [ ] **Step 3: Run → FAIL.** `pnpm --filter storybook-addon-designbook test to-drupal-expressions`

- [ ] **Step 4: Add `to_drupal` to node.md** — a ```jsonata block emitting the `node.type.<bundle>` `DrupalConfigEntity` and mapping `def.fields` through the field-types fragments. Keep the existing entity-type frontmatter; add the block under a clear heading.

- [ ] **Step 5: Write drupal-config.md rule** — `field.storage.*` dedup across bundles (one storage per `<et>.<field>`), and dependency-completeness expectation. Schema-first: phrase as invariants the output schema/validator can't catch.

- [ ] **Step 6: Run test + validators + `pnpm check`** → PASS / no errors.

- [ ] **Step 7: Touch + commit**

```bash
touch .agents/skills/designbook-drupal/data-model/blueprints/node.md
git add .agents/skills/designbook-drupal/data-model/blueprints/node.md .agents/skills/designbook-drupal/data-model/rules/drupal-config.md packages/storybook-addon-designbook/src/sync/__tests__/to-drupal-expressions.test.ts
git commit -m "feat(sync): node to_drupal + field.storage dedup rule"
```

---

## Task 5: sync concern skeleton — workflow + transform/write-config tasks

**Files:**
- Create: `.agents/skills/designbook/sync/workflows/sync-to.md`
- Create: `.agents/skills/designbook/sync/tasks/intake.md`, `resolve-filter.md`, `transform.md`, `write-config.md`, `outtake.md`

**Interfaces:**
- Consumes: `DataModel` (`$DESIGNBOOK_DATA/data-model.yml`), the matched entity-type blueprint's `to_drupal`, `config_sync_dir` resolver (Task 1), `DrupalConfigEntity` schema (Task 2).
- Produces: written `<config_name>.yml` files in the config-sync dir. `transform`'s result validated against `DrupalConfigSet`.

- [ ] **Step 1: Load skill-creator** (workflow-files + task-files + common rules). Read `designbook/css-generate/workflows/*.md` and `tasks/generate-jsonata.md` as the template for `engine: direct`, `each:`, `result.path`, `result.validators` (`cmd:npx jsonata-w transform --dry-run {{ file }}`).

- [ ] **Step 2: Write sync-to.md workflow**

Frontmatter: `title`, `description`, `params` (`unit` default `data-model`, `filter` default `{}`, `with_deps` default `true`, `config_sync_dir` via `resolve: config_sync_dir`), `stages` (`intake → resolve-filter → transform → write-config → sync`), `engine: direct`. (The `sync` step task is Task 6; reference it but expect it added there.)

- [ ] **Step 3: Write intake.md + resolve-filter.md**

`intake` loads `data-model.yml` and the filter; `resolve-filter` expands the filter into the list of target slices (entity_type/bundle/config_key), result an array consumed by `transform`'s `each`.

- [ ] **Step 4: Write transform.md**

`trigger.steps: [transform]`, `each` over resolved slices, body instructs: resolve the entity-type/config-type blueprint for the slice (via `trigger`/`filter`), run its `to_drupal` over the slice with `npx jsonata-w transform`, result is the `DrupalConfigEntity[]`. `result.validators: ["schema:DrupalConfigSet", "cmd:npx jsonata-w transform --dry-run {{ file }}"]`.

- [ ] **Step 5: Write write-config.md**

Serializes each `DrupalConfigEntity` to `{{ config_sync_dir }}/{{ config_name }}.yml`. `result.path` per item; validator `cmd:` that the YAML parses.

- [ ] **Step 6: Write outtake.md** — summary of written config names.

- [ ] **Step 7: Validate all skill files**

Run skill-creator validator over the new `sync/` files. Expected: no errors (frontmatter, params/results, no HOW-in-WHAT).

- [ ] **Step 8: Touch + commit**

```bash
touch .agents/skills/designbook/sync/workflows/sync-to.md .agents/skills/designbook/sync/tasks/*.md
git add .agents/skills/designbook/sync/
git commit -m "feat(sync): sync-to workflow + transform/write-config tasks"
```

---

## Task 6: sync task (drush config:import)

**Files:**
- Create: `.agents/skills/designbook/sync/tasks/sync.md`

**Interfaces:**
- Consumes: `config_sync_dir` + the written files.
- Produces: applied config; result captures drush stdout/exit.

- [ ] **Step 1: Load skill-creator** (task-files).

- [ ] **Step 2: Write sync.md** — `trigger.steps: [sync]`, body: run `drush config:import --partial --source={{ config_sync_dir }} -y`, capture output. On non-zero exit → stop + surface drush output verbatim (per spec error handling). Result records the imported config names + drush summary.

- [ ] **Step 3: Validate skill file.** skill-creator validator → no errors.

- [ ] **Step 4: Commit**

```bash
touch .agents/skills/designbook/sync/tasks/sync.md
git add .agents/skills/designbook/sync/tasks/sync.md
git commit -m "feat(sync): drush config:import sync task"
```

---

## Task 7: dependency-closure resolver

**Files:**
- Create: `packages/storybook-addon-designbook/src/sync/deps-closure.ts`
- Test: `packages/storybook-addon-designbook/src/sync/__tests__/deps-closure.test.ts`
- Modify: `.agents/skills/designbook/sync/tasks/resolve-deps.md` (new) + add `resolve-deps` stage to `sync-to.md`

**Interfaces:**
- Consumes: `DrupalConfigEntity[]` (each with `data.dependencies.config[]`).
- Produces: `closure(entities, {withDeps}): DrupalConfigEntity[]` — when `withDeps`, the transitive set reachable via `dependencies.config`; when not, the input set unchanged.

- [ ] **Step 1: Write the failing test**

```ts
import { closure } from '../deps-closure';

const A = { config_name: 'field.field.node.article.field_body', data: { dependencies: { config: ['field.storage.node.field_body', 'node.type.article'] } } };
const STORAGE = { config_name: 'field.storage.node.field_body', data: { dependencies: { config: [] } } };
const TYPE = { config_name: 'node.type.article', data: { dependencies: { config: [] } } };

it('with-deps pulls the transitive closure', () => {
  const out = closure([A], { withDeps: true, pool: [A, STORAGE, TYPE] });
  expect(out.map(e => e.config_name).sort()).toEqual(
    ['field.field.node.article.field_body', 'field.storage.node.field_body', 'node.type.article']);
});

it('no-deps returns only the target', () => {
  const out = closure([A], { withDeps: false, pool: [A, STORAGE, TYPE] });
  expect(out.map(e => e.config_name)).toEqual(['field.field.node.article.field_body']);
});
```

- [ ] **Step 2: Run → FAIL.** `pnpm --filter storybook-addon-designbook test deps-closure`

- [ ] **Step 3: Implement `closure`** — BFS over `data.dependencies.config`, resolving names against `pool`, dedup by `config_name`.

- [ ] **Step 4: Run → PASS** + `pnpm check`.

- [ ] **Step 5: Wire into the workflow** — add `resolve-deps.md` task (runs `closure` over the transform output when `with_deps`), insert the `resolve-deps` stage in `sync-to.md` between `transform` and `write-config`. Load skill-creator; validate.

- [ ] **Step 6: Touch + commit**

```bash
touch .agents/skills/designbook/sync/tasks/resolve-deps.md .agents/skills/designbook/sync/workflows/sync-to.md
git add packages/storybook-addon-designbook/src/sync/ .agents/skills/designbook/sync/
git commit -m "feat(sync): dependency-closure resolver + --with-deps wiring"
```

---

## Task 8: config-entity to_drupal (view + image_style)

**Files:**
- Modify: `.agents/skills/designbook-drupal/data-model/blueprints/view.md`
- Modify: `.agents/skills/designbook/data-model/blueprints/image_style.md`
- Test: append to `to-drupal-expressions.test.ts`

**Interfaces:**
- Consumes: `config.view.<key>` / `config.image_style.<key>` from `data-model.yml`.
- Produces: `to_drupal` blocks emitting `views.view.<key>` / `image.style.<key>` `DrupalConfigEntity`.

- [ ] **Step 1: Load skill-creator.**

- [ ] **Step 2: Write failing tests** for `views.view.*` and `image.style.*` shapes (config_name + required keys + dependencies), analogous to Task 4's test (repeat the assertion structure, do not reference Task 4).

- [ ] **Step 3: Run → FAIL.**

- [ ] **Step 4: Add `to_drupal` blocks** to `view.md` and `image_style.md`.

- [ ] **Step 5: Run tests + validators + `pnpm check` → PASS.**

- [ ] **Step 6: Touch + commit**

```bash
touch .agents/skills/designbook-drupal/data-model/blueprints/view.md .agents/skills/designbook/data-model/blueprints/image_style.md
git add -A
git commit -m "feat(sync): views + image_style to_drupal"
```

---

## Task 9: media / block_content / taxonomy_term to_drupal

**Files:**
- Modify: `media.md`, `block_content.md`, `taxonomy_term.md` (all under `designbook-drupal/data-model/blueprints/`)
- Test: append cases to `to-drupal-expressions.test.ts`

**Interfaces:**
- Consumes: `content.media.*` / `content.block_content.*` / `content.taxonomy_term.*`.
- Produces: `to_drupal` emitting `media.type.*` / `block_content.type.*` / `taxonomy.vocabulary.*` + field config (via field-types).

- [ ] **Step 1: Load skill-creator.**
- [ ] **Step 2: Write one failing test per entity type** (config_name assertions; repeat structure).
- [ ] **Step 3: Run → FAIL.**
- [ ] **Step 4: Add `to_drupal` to each blueprint** (each delegates fields to `$fieldToStorage`/`$fieldToInstance`).
- [ ] **Step 5: Tests + validators + `pnpm check` → PASS.**
- [ ] **Step 6: Touch + commit**

```bash
touch .agents/skills/designbook-drupal/data-model/blueprints/media.md .agents/skills/designbook-drupal/data-model/blueprints/block_content.md .agents/skills/designbook-drupal/data-model/blueprints/taxonomy_term.md
git add -A
git commit -m "feat(sync): media/block_content/taxonomy_term to_drupal"
```

---

## Task 10: end-to-end smoke in a test workspace

**Files:**
- Create: `packages/storybook-addon-designbook/src/sync/__tests__/sync-to.smoke.test.ts` (or a workspace script under `scripts/`, matching existing smoke conventions).

**Interfaces:**
- Consumes: a fixture `data-model.yml` (one node bundle + one image_style) and a temp config-sync dir.
- Produces: assertion that `sync-to` writes the expected `*.yml` set and that each parses + matches `DrupalConfigSet`.

- [ ] **Step 1: Build the test workspace**

Run: `./scripts/setup-workspace.sh sync-smoke` (from repo/worktree root). This copies the worktree's `.agents`/`.claude` so the new skill files are present.

- [ ] **Step 2: Write the smoke test** — runs the `sync-to` workflow against the fixture with `--filter et=node,bundle=article` and a temp `config_sync_dir`; asserts `node.type.article.yml`, `field.storage.node.*.yml`, `field.field.node.article.*.yml` exist and validate against `DrupalConfigSet`. (Stub/skip the actual `drush config:import` — assert on the written files; live cim is exercised in manual verification.)

- [ ] **Step 3: Run → iterate to PASS.** `pnpm --filter storybook-addon-designbook test sync-to.smoke`

- [ ] **Step 4: Manual live check (documented, not automated)**

In a real Drupal workspace: `debo sync-to data-model --filter et=node,bundle=article`, then confirm `drush config:status` shows the imported config and the bundle exists. Record the command + observed output in the commit message.

- [ ] **Step 5: `pnpm check` + commit**

```bash
git add packages/storybook-addon-designbook/src/sync/__tests__/sync-to.smoke.test.ts
git commit -m "test(sync): sync-to data-model end-to-end smoke"
```

---

## Self-Review (Plan 1)

- **Spec coverage (Plan 1 scope):** config-sync-dir (T1), output schema/schema-first (T2), field-types incl. schema extension (T3), entity-type to_drupal for node + config dedup (T4), config-entities (T8), remaining content entity types (T9), workflow + transform + write + sync (T5/T6), selective filter + deps (T5 resolve-filter, T7 deps), drush cim (T6), smoke + manual live (T10). Displays, sync-from, content-data, verify → Plans 2–5 (intentionally out of scope).
- **Placeholder scan:** JSONata bodies are described by their I/O + tested by exact expression tests rather than transcribed in full — each has a failing test pinning its output; acceptable because the test is the executable spec. No "TBD"/"handle edge cases".
- **Type consistency:** `DrupalConfigEntity`/`DrupalConfigSet` (T2) used by T5 validators and T3/T4/T8/T9 tests; `$fieldToStorage`/`$fieldToInstance` (T3) consumed by T4/T9; `closure(...)` (T7) signature matches its test; `config_sync_dir` resolver name (T1) referenced in T5/T6/T7.
- **Open item carried to Plan 5:** per-view-mode render-URL mechanism (contrib module vs minimal preview route) — must be decided before the verify plan.
