# Unified Sample Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-section `data.yml` with one per-bundle entity pool under `data/`, where each record carries a generic `__designbook.section` tag and scenes select records via pure JSONata at build time.

**Architecture:** Sample data moves from `sections/{id}/data.yml` to `data/<entity_type>.<bundle>.yml` (one record array per file). A loader merges all files into the existing in-memory `SampleData` shape, placing each bundle under `content`/`config` by looking it up in `data-model.yml`. Scene items replace the positional `record: N` with a JSONata `select:` predicate evaluated in `entity-builder.ts` at build time against the bundle's record array (`$`). Field-mapping JSONata per view mode is unchanged.

**Tech Stack:** TypeScript (ESM, NodeNext), Vitest, js-yaml, jsonata, pnpm workspace. Designbook skill files are YAML+markdown under `.agents/skills/`.

## Global Constraints

- **No migration / back-compat code.** Existing on-disk artifacts are disposable; testing is from scratch. Update writers/readers to the new shape — never read or upgrade old artifacts. (CLAUDE.md)
- **`pnpm check` must pass** (typecheck → lint → test, fail-fast) before any commit that touches `packages/storybook-addon-designbook`.
- **Skill files are edited only via `designbook-skill-creator`.** Before creating or editing ANY file under `.agents/skills/designbook/` or `.agents/skills/designbook-*/`, load `designbook-skill-creator` first, plus the matching per-file-type rule (`rules/task-files.md`, `rules/workflow-files.md`, `rules/rule-files.md`, `rules/schema-files.md`, always `rules/common-rules.md`). This is a hard rule.
- **`.claude/skills/` is a symlink to `.agents/skills/`** — edit only under `.agents/skills/`.
- **Reserved record key:** `__designbook` is a reserved metadata block on a sample-data record; `__designbook.section` is a string or an array of strings. It is never a data-model field.
- **Selector convention:** `select:` is a JSONata predicate over `$` (the bundle's record array). Append `[0]` for a single record (entity view display); omit `[0]` for list/view contexts. Use the `in` operator (`'section_a' in __designbook.section`) so string and array tags match uniformly.

---

## File Structure

**Modified (TypeScript):**
- `packages/storybook-addon-designbook/src/renderer/types.ts` — `EntitySceneNode` / `EntityOrigin`: `select?: string` replaces `record?: number`.
- `packages/storybook-addon-designbook/src/renderer/scene-module-builder.ts` — `loadSampleData` rewritten to merge `data/*.yml`; new `mergeDataDir` helper.
- `packages/storybook-addon-designbook/src/renderer/parser.ts` — `expandEntries`: drop `record`/`records` handling, pass `select` through.
- `packages/storybook-addon-designbook/src/renderer/builders/entity-builder.ts` — JSONata `select` selection replaces positional pick.
- `packages/storybook-addon-designbook/src/validators/data.ts` — validate the merged `data/` pool; skip `__designbook`; validate `section` shape.
- `packages/storybook-addon-designbook/src/validation-registry.ts` — pass the `data/` directory to the data validator.

**Modified (tests + fixtures):**
- `packages/storybook-addon-designbook/src/renderer/__tests__/entity-builder.test.ts`
- `packages/storybook-addon-designbook/src/renderer/__tests__/fixtures/test.scenes.yml`
- `packages/storybook-addon-designbook/src/renderer/__tests__/fixtures/data*.yml` (new `data/` fixture dir)
- `packages/storybook-addon-designbook/src/validators/__tests__/data.test.ts` + `fixtures/data/**`
- `packages/storybook-addon-designbook/src/renderer/parser` tests (if present)

**Modified (skill files — via designbook-skill-creator):**
- `.agents/skills/designbook/sample-data/tasks/create-sample-data.md`
- `.agents/skills/designbook/sample-data/workflows/sample-data.md`
- `.agents/skills/designbook-drupal/sample-data/rules/canvas.md` (storage-location note only)

**Regenerated (repo fixtures):**
- `fixtures/**/sections/*/data.yml` → `fixtures/**/data/*.yml`
- `fixtures/**/*.section.scenes.yml` entity items → `select:`

---

## Task 1: Types — `select` replaces `record`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/renderer/types.ts:76-82` (`EntitySceneNode`), `:187-197` (`EntityOrigin`)

**Interfaces:**
- Produces: `EntitySceneNode.select?: string`, `EntityOrigin.select?: string` (the `record?: number` fields are removed). Consumed by Tasks 2–4.

- [ ] **Step 1: Edit `EntitySceneNode`**

Replace the `record?: number;` line in `EntitySceneNode` (currently `types.ts:81`) with:

```typescript
  /** JSONata predicate over the bundle's record array (`$`). */
  select?: string;
```

- [ ] **Step 2: Edit `EntityOrigin`**

Replace the `record?: number;` line in `EntityOrigin` (currently `types.ts:192`) with:

```typescript
  /** JSONata selector used to pick the record(s). */
  select?: string;
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter storybook-addon-designbook exec tsc --noEmit`
Expected: errors only in `entity-builder.ts` and `parser.ts` (they still reference `record`). These are fixed in Tasks 2–3. Confirm no errors elsewhere.

- [ ] **Step 4: Commit**

```bash
git add packages/storybook-addon-designbook/src/renderer/types.ts
git commit -m "refactor(renderer): replace entity record index with select selector type"
```

---

## Task 2: Parser — pass `select` through, drop index shorthand

**Files:**
- Modify: `packages/storybook-addon-designbook/src/renderer/parser.ts:47-81` (`expandEntries`)
- Test: `packages/storybook-addon-designbook/src/renderer/__tests__/parser.test.ts` (create if absent)

**Interfaces:**
- Consumes: `EntitySceneNode.select` (Task 1).
- Produces: `expandEntries(entries)` returns entity nodes with `select` preserved and no injected `record` field.

- [ ] **Step 1: Write the failing test**

Create/append `packages/storybook-addon-designbook/src/renderer/__tests__/parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { expandEntries } from '../parser';

describe('expandEntries — select model', () => {
  it('passes entity entries through with select preserved', () => {
    const out = expandEntries([
      { entity: 'node.doc', view_mode: 'full', select: "$[id='3'][0]" },
    ]);
    expect(out).toEqual([{ entity: 'node.doc', view_mode: 'full', select: "$[id='3'][0]" }]);
  });

  it('does not inject a record field', () => {
    const out = expandEntries([{ entity: 'node.doc', view_mode: 'full' }]);
    expect(out[0]).not.toHaveProperty('record');
  });

  it('passes component entries through untouched', () => {
    const out = expandEntries([{ component: 'p:heading', props: { level: 'h1' } }]);
    expect(out).toEqual([{ component: 'p:heading', props: { level: 'h1' } }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/renderer/__tests__/parser.test.ts`
Expected: FAIL — the second test fails because `expandEntries` injects `record: 0`.

- [ ] **Step 3: Rewrite `expandEntries`**

Replace the body of `expandEntries` (`parser.ts:47-81`) with:

```typescript
export function expandEntries(entries: unknown[]): SceneNode[] {
  const result: SceneNode[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    // Entity, component, config, scene entries — pass through as-is.
    // Record selection is a JSONata `select:` predicate resolved in entity-builder.
    result.push(entry as SceneNode);
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/renderer/__tests__/parser.test.ts`
Expected: PASS (all three).

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/renderer/parser.ts packages/storybook-addon-designbook/src/renderer/__tests__/parser.test.ts
git commit -m "refactor(renderer): parser passes entity select through, drops record index"
```

---

## Task 3: entity-builder — JSONata `select` selection

**Files:**
- Modify: `packages/storybook-addon-designbook/src/renderer/builders/entity-builder.ts:40-101`
- Test: `packages/storybook-addon-designbook/src/renderer/__tests__/entity-builder.test.ts`

**Interfaces:**
- Consumes: `EntitySceneNode.select` (Task 1), `ctx.sampleData` (`SampleData`).
- Produces: `entityBuilder.build(node, ctx)` resolves the record by evaluating `node.select` (JSONata) against the bundle's record array; passes the result (or `{}` when absent/empty) into the view-mode mapping JSONata.

- [ ] **Step 1: Update the test sample data and add select cases**

In `entity-builder.test.ts`, give the inline records stable `id`s and a section tag. Replace the `sampleData` const (`:8-24`) with:

```typescript
const sampleData = {
  content: {
    node: {
      article: [
        {
          id: '1',
          __designbook: { section: 'section_a' },
          title: 'Understanding Modern Architecture',
          field_body: '<p>Architecture...</p>',
          field_media: { url: '/images/arch.jpg', alt: 'Building' },
          field_teaser: 'A deep dive.',
        },
        {
          id: '2',
          __designbook: { section: 'section_b' },
          title: 'Second Article',
          field_body: '<p>Second...</p>',
          field_media: { url: '/images/two.jpg', alt: 'Two' },
          field_teaser: 'Another.',
        },
      ],
    },
    user: {
      user: [{ id: '1', name: 'Jane Doe', field_avatar: '/images/jane.jpg' }],
    },
  },
};
```

- [ ] **Step 2: Rewrite the existing entity tests to use `select`, add a section-pick test**

Replace each `record: 0` in the test nodes with `select: "$[0]"`, replace `record: 99` (the "missing record" test, `:110-126`) with `select: "$[id='999'][0]"`, and add this test after the `with-author` test:

```typescript
it('build() selects the record matching the section tag', async () => {
  const node = {
    type: 'entity',
    entity_type: 'node',
    bundle: 'article',
    view_mode: 'teaser',
    select: "$['section_b' in __designbook.section][0]",
  };

  const ctx = makeCtx();
  const result = await entityBuilder.build(node, ctx);

  // teaser maps `title` into the heading slot — section_b record has "Second Article"
  const json = JSON.stringify(result.nodes);
  expect(json).toContain('Second Article');
  expect(json).not.toContain('Understanding Modern Architecture');
});
```

The "view entity without data" test (`:128-141`, no `record`/`select`) stays as-is — it asserts the view resolves with `{}` input.

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/renderer/__tests__/entity-builder.test.ts`
Expected: FAIL — `entity-builder.ts` still reads the removed `record` field; the section-pick test gets the wrong record.

- [ ] **Step 4: Implement JSONata selection in `entity-builder.ts`**

In `build()`, replace the record-index handling. Remove `const record = (node['record'] as number) ?? 0;` (`:54`). In the `EntityOrigin` literal (`:59`) replace `record,` with `select,` where `select` is read from the node. Replace the data-fetch block (`:67-70`) with:

```typescript
    const select = (node['select'] as string) ?? '';

    // 2. Get the bundle's record array — content first, config fallback.
    const entityArray = (ctx.sampleData?.content?.[entity_type]?.[bundle] ??
      ctx.sampleData?.config?.[entity_type]?.[bundle] ?? []) as Record<string, unknown>[];

    // Resolve the record(s) via the JSONata select predicate over the array (`$`).
    // No select (e.g. view entities) → evaluate the mapping with {}.
    let recordData: unknown = {};
    if (select) {
      const selected = await jsonata(select).evaluate(entityArray);
      recordData = selected ?? {};
    }
```

Update the `EntityOrigin` declaration to carry `select` instead of `record`:

```typescript
    const entity: EntityOrigin = { entity_type, bundle, view_mode, select, mapping: jsonataPath };
```

The mapping evaluation (`expr.evaluate(recordData)`) is unchanged — it now receives the selected record (single object when the selector ends in `[0]`, a sequence otherwise, or `{}`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/renderer/__tests__/entity-builder.test.ts`
Expected: PASS (all tests, including the new section-pick test).

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/renderer/builders/entity-builder.ts packages/storybook-addon-designbook/src/renderer/__tests__/entity-builder.test.ts
git commit -m "feat(renderer): select entity records via JSONata predicate at build time"
```

---

## Task 4: Loader — merge `data/*.yml` into one pool

**Files:**
- Modify: `packages/storybook-addon-designbook/src/renderer/scene-module-builder.ts:91-111` (`loadSampleData`)
- Test: `packages/storybook-addon-designbook/src/renderer/__tests__/load-sample-data.test.ts` (create)
- Test fixtures: `packages/storybook-addon-designbook/src/renderer/__tests__/fixtures/load-data/` (create)

**Interfaces:**
- Consumes: `data-model.yml` (to place each bundle under `content`/`config`), `data/<entity_type>.<bundle>.yml` files (each a YAML record array).
- Produces: `loadSampleData(designbookDir): SampleData` — merged in-memory pool of the existing `SampleData` shape. The `id`/`firstSceneSection` parameters are removed; selection no longer depends on section directories.

- [ ] **Step 1: Create test fixtures**

Create `packages/storybook-addon-designbook/src/renderer/__tests__/fixtures/load-data/data-model.yml`:

```yaml
content:
  node:
    doc:
      fields:
        field_body: { type: text }
  taxonomy_term:
    topic:
      fields:
        name: { type: string, required: true }
config:
  view:
    recent_articles:
      view_modes:
        default: { template: view-entity }
```

Create `.../fixtures/load-data/data/node.doc.yml`:

```yaml
- id: "1"
  __designbook: { section: section_a }
  field_body: "<p>One</p>"
- id: "2"
  __designbook: { section: section_b }
  field_body: "<p>Two</p>"
```

Create `.../fixtures/load-data/data/taxonomy_term.topic.yml`:

```yaml
- id: "1"
  name: "Guides"
```

Create `.../fixtures/load-data/data/view.recent_articles.yml`:

```yaml
- id: "1"
  __designbook: { section: section_a }
```

- [ ] **Step 2: Write the failing test**

Create `packages/storybook-addon-designbook/src/renderer/__tests__/load-sample-data.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadSampleData } from '../scene-module-builder';

const DIR = resolve(__dirname, 'fixtures', 'load-data');

describe('loadSampleData — merged data/ pool', () => {
  it('merges per-bundle files into content/config by data-model lookup', () => {
    const data = loadSampleData(DIR);
    expect(data.content?.node?.doc).toHaveLength(2);
    expect(data.content?.taxonomy_term?.topic?.[0]?.name).toBe('Guides');
    // view is config in the data-model → lands under config, not content
    expect(data.config?.view?.recent_articles).toHaveLength(1);
    expect(data.content?.view).toBeUndefined();
  });

  it('preserves the __designbook tag on records', () => {
    const data = loadSampleData(DIR);
    const rec = data.content?.node?.doc?.find((r) => r.id === '2');
    expect((rec?.__designbook as { section?: string })?.section).toBe('section_b');
  });

  it('returns empty pool when data/ is absent', () => {
    const data = loadSampleData(resolve(__dirname, 'fixtures'));
    expect(data).toEqual({});
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/renderer/__tests__/load-sample-data.test.ts`
Expected: FAIL — `loadSampleData` is not exported and has the old signature.

- [ ] **Step 4: Rewrite `loadSampleData` + add `mergeDataDir`**

In `scene-module-builder.ts` add `readdirSync` to the `node:fs` import (`:11`):

```typescript
import { readFileSync, existsSync, readdirSync } from 'node:fs';
```

Replace `loadSampleData` (`:91-111`) with:

```typescript
/**
 * Look a bundle up in the data model and return its namespace.
 * Returns 'content', 'config', or null when the bundle is unknown.
 */
function namespaceFor(dataModel: DataModel, entityType: string, bundle: string): 'content' | 'config' | null {
  if (dataModel.content?.[entityType]?.[bundle]) return 'content';
  if (dataModel.config?.[entityType]?.[bundle]) return 'config';
  return null;
}

/**
 * Merge every `data/<entity_type>.<bundle>.yml` file into one SampleData pool.
 * Each file holds a bare record array; its content/config namespace is
 * resolved by looking the bundle up in the data model.
 */
export function loadSampleData(designbookDir: string): SampleData {
  const dataDir = join(designbookDir, 'data');
  if (!existsSync(dataDir)) return {};

  const dataModel = loadDataModel(designbookDir);
  const pool: SampleData = {};

  for (const file of readdirSync(dataDir)) {
    if (!file.endsWith('.yml')) continue;
    const base = file.slice(0, -'.yml'.length);
    const dot = base.indexOf('.');
    if (dot < 1) continue;
    const entityType = base.slice(0, dot);
    const bundle = base.slice(dot + 1);

    const ns = namespaceFor(dataModel, entityType, bundle);
    if (!ns) {
      console.warn(`[Designbook] data/${file}: bundle ${entityType}.${bundle} not in data-model — skipped`);
      continue;
    }

    const records = parseYaml(readFileSync(join(dataDir, file), 'utf-8'));
    if (!Array.isArray(records)) {
      console.warn(`[Designbook] data/${file}: expected a record array — skipped`);
      continue;
    }

    pool[ns] ??= {};
    pool[ns]![entityType] ??= {};
    pool[ns]![entityType]![bundle] = records as Record<string, unknown>[];
  }

  return pool;
}
```

- [ ] **Step 5: Update the caller in `buildSceneModule`**

Replace the `loadSampleData(...)` call (`:147-151`) with:

```typescript
  const sampleData = loadSampleData(designbookDir);
```

Remove the now-unused `firstScene` variable (`:146`) if nothing else uses it.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/renderer/__tests__/load-sample-data.test.ts`
Expected: PASS (all three).

- [ ] **Step 7: Commit**

```bash
git add packages/storybook-addon-designbook/src/renderer/scene-module-builder.ts packages/storybook-addon-designbook/src/renderer/__tests__/load-sample-data.test.ts packages/storybook-addon-designbook/src/renderer/__tests__/fixtures/load-data
git commit -m "feat(renderer): merge per-bundle data/ files into one sample-data pool"
```

---

## Task 5: data validator — validate the merged pool, skip `__designbook`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/validators/data.ts:28-123`
- Modify: `packages/storybook-addon-designbook/src/validation-registry.ts` (data validator registration)
- Test: `packages/storybook-addon-designbook/src/validators/__tests__/data.test.ts` + `fixtures/data/**`

**Interfaces:**
- Consumes: `data-model.yml`, the `data/` directory.
- Produces: `validateData(dataModelPath, dataDir): ValidationResult` — merges `data/*.yml` into a pool (same logic as Task 4), then runs the existing entity/bundle/field/reference checks. `__designbook` is never reported as an unknown field; `__designbook.section` must be a string or string array.

- [ ] **Step 1: Build the new fixture layout**

Under `packages/storybook-addon-designbook/src/validators/__tests__/fixtures/data/valid/`, keep `data-model.yml`. Replace `data.yml` with a `data/` directory holding one file per bundle. For the `valid` case create `valid/data/node.article.yml`:

```yaml
- id: "1"
  __designbook: { section: section_a }
  title: "Hello"
  field_body: "<p>Body</p>"
```

…and the sibling bundle files (`media.image.yml`, `taxonomy_term.category.yml`, `view.recent_articles.yml`) mirroring the records the existing `valid/data.yml` held, each as a bare array with `id`s. Do the same for the `invalid-entity`, `invalid-bundle`, `invalid-config`, `warning-field`, `warning-required`, `warning-broken-ref` cases — one `data/` dir per case, each reproducing the single offending condition the old single-file fixture encoded.

- [ ] **Step 2: Update the failing tests**

In `data.test.ts`, point every `validateData(...)` call at the case's `data/` directory instead of its `data.yml`, e.g.:

```typescript
const result = validateData(validDataModel, resolve(fixtures, 'valid', 'data'));
```

Add a test that `__designbook` is not flagged and that a malformed section is:

```typescript
it('does not flag __designbook and rejects a non-string/array section', () => {
  const ok = validateData(validDataModel, resolve(fixtures, 'valid', 'data'));
  expect(ok.warnings.find((w) => w.includes('__designbook'))).toBeUndefined();

  const bad = validateData(validDataModel, resolve(fixtures, 'invalid-section', 'data'));
  expect(bad.errors.some((e) => e.includes('__designbook.section'))).toBe(true);
});
```

Create `fixtures/data/invalid-section/data-model.yml` (copy of valid) and `invalid-section/data/node.article.yml` with `__designbook: { section: 5 }`.

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/validators/__tests__/data.test.ts`
Expected: FAIL — `validateData` still expects a single file path and warns on `__designbook`.

- [ ] **Step 4: Rewrite `validateData` to merge the pool**

Change the signature to `validateData(dataModelPath: string, dataDir: string)`. Replace the single-file read (`:35-40`) with a directory merge mirroring Task 4 (`namespaceFor` + per-file parse into `content`/`config`). Then run the existing loops unchanged, with two additions inside the per-record field loop (`:69`):

```typescript
        for (const field of Object.keys(rec as Record<string, unknown>)) {
          if (field === 'id') continue;
          if (field === '__designbook') {
            const meta = (rec as Record<string, unknown>).__designbook as { section?: unknown };
            const sec = meta?.section;
            const okSection =
              typeof sec === 'string' ||
              (Array.isArray(sec) && sec.every((s) => typeof s === 'string'));
            if (sec !== undefined && !okSection) {
              errors.push(`Invalid __designbook.section on ${entityType}.${bundle} id=${rid} — must be string or string[]`);
            }
            continue;
          }
          // …existing unknown-field / reference checks…
        }
```

Keep the existing missing-data-model and missing-`data/` guards (return `valid:false` with a clear message when `data/` is absent).

- [ ] **Step 5: Update the registration**

In `validation-registry.ts`, change the `data` entry so it passes the data directory. The validator runs against the whole pool, so resolve `data/` from the config data root:

```typescript
  data: async (_file, config) =>
    toFileResult(validateData(resolve(config.data, 'data-model.yml'), resolve(config.data, 'data')), resolve(config.data, 'data'), 'data'),
```

Update `cli.ts`'s direct call similarly (pass the `data/` dir).

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/validators/__tests__/data.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/storybook-addon-designbook/src/validators packages/storybook-addon-designbook/src/validation-registry.ts packages/storybook-addon-designbook/src/cli.ts
git commit -m "feat(validators): validate merged data/ pool and __designbook.section shape"
```

---

## Task 6: Update addon scene fixture + full package check

**Files:**
- Modify: `packages/storybook-addon-designbook/src/renderer/__tests__/fixtures/test.scenes.yml`
- Modify: any remaining fixtures/tests referencing `record:` in `packages/storybook-addon-designbook`

**Interfaces:**
- Consumes: the `select` scene model (Tasks 1–3).

- [ ] **Step 1: Convert `record:` to `select:` in `test.scenes.yml`**

Replace each entity item's `record: 0` with `select: "$[0]"`. For example the `Flat` scene becomes:

```yaml
  - name: Flat
    items:
      - entity: node.article
        view_mode: teaser
        select: "$[0]"
```

Apply the same to `EntityInEntity`, `EntityInComponentSlot`, and `WithShell`. Leave `ViewEntity` (no record) unchanged.

- [ ] **Step 2: Find any stragglers**

Run: `git grep -n "record:" packages/storybook-addon-designbook/src`
Expected: no matches in scene YAML or scene-building code (matches only in unrelated contexts, if any — inspect each).

- [ ] **Step 3: Run the full package check**

Run: `pnpm --filter storybook-addon-designbook check` (or repo `pnpm check`)
Expected: typecheck, lint, and all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/storybook-addon-designbook
git commit -m "test(renderer): convert scene fixtures to select model"
```

---

## Task 7: sample-data skill — emit per-bundle `data/` with `__designbook.section`

> **REQUIRED:** Load `designbook-skill-creator` (and `rules/task-files.md`, `rules/workflow-files.md`, `rules/common-rules.md`) BEFORE editing any file in this task. Validate the edited files against those rules before committing.

**Files:**
- Modify: `.agents/skills/designbook/sample-data/tasks/create-sample-data.md`
- Modify: `.agents/skills/designbook/sample-data/workflows/sample-data.md`

**Interfaces:**
- Produces: sample data written as `$DESIGNBOOK_DATA/data/<entity_type>.<bundle>.yml`, each a bare record array; every generated record carries `__designbook.section: <section_id>`. Consumed by the loader (Task 4) and validator (Task 5).

- [ ] **Step 1: Load the authoring skill**

Invoke `designbook-skill-creator`. Read `rules/task-files.md`, `rules/workflow-files.md`, `rules/common-rules.md`.

- [ ] **Step 2: Update the task result contract**

In `create-sample-data.md`, change the `result` block so the artifact is the data directory and per-bundle files, not `sections/{{ section_id }}/data.yml`:

```yaml
result:
  type: object
  required: [sample-data]
  properties:
    sample-data:
      path: $DESIGNBOOK_DATA/data/
      type: object
      validators: [data]
```

Keep `section_id` in `params` — it becomes the `__designbook.section` tag value, no longer a directory.

- [ ] **Step 3: Rewrite the workflow Output Format + idempotency**

In `workflows/sample-data.md`:
- "Step 1: Read existing data" reads each `$DESIGNBOOK_DATA/data/<entity_type>.<bundle>.yml` (not a per-section file) to build `existing_counts`.
- "Output Format" specifies one file per bundle, each a bare record array (no `content:`/`config:` wrapper — namespace is derived from the data model by the loader), and mandates the `__designbook.section: <section_id>` block on every record:

```yaml
# data/node.doc.yml
- id: "1"
  __designbook:
    section: getting-started
  field_body: "<h2>…</h2>"
```

- Record-count rules (6 for non-full, max(existing,3) for canvas/layout-builder full, 1 for field-map / config) and append-only semantics are unchanged, applied per bundle file.
- Add a note that scenes select these records via JSONata `select:` (see scenes authoring), e.g. `select: "$['getting-started' in __designbook.section and id='3'][0]"`.

- [ ] **Step 4: Validate against the authoring rules**

Re-read `rules/task-files.md` and `rules/workflow-files.md`; confirm no HOW-in-WHAT leakage, no rule owning params, no inline-duplicated schema. Run any skill validator the skill-creator documents.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/sample-data
git commit -m "feat(skill): sample-data emits per-bundle data/ with __designbook.section tag"
```

---

## Task 8: Drupal sample-data rules — storage-location note

> **REQUIRED:** Load `designbook-skill-creator` (and `rules/rule-files.md`, `rules/common-rules.md`) BEFORE editing.

**Files:**
- Modify: `.agents/skills/designbook-drupal/sample-data/rules/canvas.md`

**Interfaces:**
- Consumes: the per-bundle `data/` layout (Task 7).

- [ ] **Step 1: Load the authoring skill**

Invoke `designbook-skill-creator`; read `rules/rule-files.md`, `rules/common-rules.md`.

- [ ] **Step 2: Update the storage sentence**

In `canvas.md`, the line "In `data.yml` they appear under `canvas_page.<bundle>`" becomes: canvas pages appear in `data/canvas_page.<bundle>.yml` as a bare record array, each record carrying the `__designbook.section` tag; the `components` tree field is unchanged. No other rule content changes.

- [ ] **Step 3: Validate + commit**

Confirm against `rules/rule-files.md` (hard constraint, no params, no HOW). Then:

```bash
git add .agents/skills/designbook-drupal/sample-data/rules/canvas.md
git commit -m "docs(skill): canvas rule references per-bundle data/ storage"
```

---

## Task 9: Regenerate repo fixtures + end-to-end verification

**Files:**
- Delete: `fixtures/**/sections/*/data.yml`
- Create: `fixtures/**/data/*.yml`
- Modify: `fixtures/**/*.section.scenes.yml` (entity items → `select:`)

**Interfaces:**
- Consumes: all prior tasks (loader, builder, validator, skill output shape).

- [ ] **Step 1: Inventory existing fixture data**

Run: `git grep -l --name-only "" -- 'fixtures/**/sections/**/data.yml'` and `find fixtures -path '*/sections/*/data.yml'`
Record each section's records to redistribute into per-bundle files.

- [ ] **Step 2: Convert each fixture**

For every `fixtures/<suite>/.../sections/<id>/data.yml`, split its `content:`/`config:` records into `fixtures/<suite>/.../data/<entity_type>.<bundle>.yml` (bare arrays), adding `__designbook: { section: <id> }` to each record. Remove the old `sections/*/data.yml`. Update each `*.section.scenes.yml` entity item: replace `record: N` with a `select:` predicate (`"$['<id>' in __designbook.section and id='<id-of-record>'][0]"`, or `"$[N]"` where positional is fine for the fixture).

- [ ] **Step 3: Verify a fixture builds**

Set up a test workspace and confirm the renderer resolves entities from the new layout:

Run: `./scripts/setup-workspace.sh sample-data-check` then build/preview per the designbook-test skill, or run the scene validator over a converted fixture:
`pnpm --filter storybook-addon-designbook exec vitest run src/validators`
Expected: scenes resolve, data validator reports no hard errors on converted fixtures.

- [ ] **Step 4: Full repo check**

Run: `pnpm check`
Expected: typecheck, lint, test all PASS.

- [ ] **Step 5: Commit**

```bash
git add fixtures
git commit -m "test(fixtures): migrate sample data to per-bundle data/ with section tags"
```

---

## Self-Review

**Spec coverage:**
- Storage per-bundle `data/` → Tasks 4, 7, 9. ✓
- `__designbook.section` tag (string/array) → Tasks 3 (test data), 5 (validation), 7 (generation). ✓
- Section generic (not canvas) → loader/validator are entity-agnostic; canvas rule only notes storage (Task 8). ✓
- JSONata `select` at build time, replaces `record: N` → Tasks 1–3. ✓
- Multiplicity (no enforcement, `[0]` convention) → Task 3 (builder passes result through), Global Constraints. ✓
- `in` operator for string/array → Task 3 test, Global Constraints. ✓
- Loader merges, content/config via data-model → Task 4. ✓
- Affected: `loadSampleData` (4), `entity-builder` (3), sample-data skill (7), validator (5), fixtures (6, 9). ✓
- No migration → Global Constraints; fixtures regenerated not upgraded (Task 9). ✓
- Out of scope (Drupal export, mapping mechanism, declarative sugar) → not planned. ✓

**Placeholder scan:** No TBD/TODO. Skill-file tasks (7, 8) intentionally defer exact wording to `designbook-skill-creator` rules per the hard project constraint, but specify the concrete target content and the gating step — this is a real constraint, not a placeholder.

**Type consistency:** `select?: string` defined in Task 1 (`EntitySceneNode`, `EntityOrigin`), consumed identically in Tasks 2–3. `loadSampleData(designbookDir)` signature defined in Task 4, used in Task 4 Step 5. `validateData(dataModelPath, dataDir)` defined in Task 5, registered in Task 5 Step 5. `namespaceFor` helper appears in Tasks 4 and 5 (same logic — Task 5 references Task 4's implementation). Consistent.
