# `_formatted` Companion Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sample data may carry `<field>_formatted` display strings. Mappings bind them like any field. On Drupal the binding places `<field>` with a field formatter.

**Architecture:** One shared suffix helper is used by the data validator (`validation/data.ts`) and the field-map planner (`workflow/plan-composition.ts`). The JSONata compile and the renderer stay unchanged. Drupal behaviour lives in skill files: the field-map and layout-builder-display blueprints, plus one new rule. The formatter override is a view-mode setting: `view_modes.<vm>.settings.formatters.<field>`.

**Tech Stack:** TypeScript, vitest, js-yaml, JSONata; Designbook skill markdown; debo-test fixtures.

**Spec:** `docs/superpowers/specs/2026-11-25-designbook-10-formatted-companion-design.md`

## Global Constraints

- Suffix is exactly `_formatted`. The companion value is a string. The data model never declares a companion.
- Error text, verbatim:
  - Orphan companion: `Field "<key>" on <et>.<bundle> id=<id> has no declared base field "<base>"`
  - Non-string companion: `Field "<key>" on <et>.<bundle> id=<id> must be a string`
- Other unknown fields keep the current warning, `Field "<f>" on <et>.<bundle> id=<id> not in data-model`. Existing tests and fixture cases pass unmodified (AC-7).
- No migration or compat code (CLAUDE.md).
- Load `designbook-skill-creator` before editing any file under `.agents/skills/designbook*/`. Load `designbook-addon-skills` before editing `packages/storybook-addon-designbook/`.
- Run `pnpm check` before every commit.

## Review Focus

1. A declared field whose own name ends in `_formatted` (e.g. `field_text_formatted` in the model) stays a normal declared field. It is not treated as a companion. Pinned in Task 1: add `field_body_formatted: { type: string }` to a copy of the model in a fourth fixture, `formatted-declared`, and expect `valid`, no errors and no warnings, even with no `field_body` value in the record.
2. A companion bound with an `entity` descriptor is rejected as "not a reference field". Pinned in Task 2.
3. A companion whose base is a reference field (`field_media_formatted`) validates as a plain string. Pinned in Task 1.
4. `field_formatted` with base `field` vs a bare key `_formatted` (empty base) is not a companion: it gets the old warning. Pinned in Task 1.
5. A companion bound as a prop and as a slot both compile to `$fields.<field>_formatted`. Pinned in Task 2.

---

### Task 1: Suffix helper and sample-data validation (AC-1, AC-2, AC-7)

**Files:**
- Create: `packages/storybook-addon-designbook/src/shared/formatted-field.ts`
- Modify: `packages/storybook-addon-designbook/src/validation/data.ts:88-94` (unknown-field branch)
- Test: `packages/storybook-addon-designbook/src/validation/__tests__/data.test.ts`
- Create fixtures under `packages/storybook-addon-designbook/src/validation/__tests__/fixtures/data/`. Each has a `data/` dir and reuses `valid/data-model.yml`:
  - `formatted-companion/data/node.article.yml`: id "1", `title: "A"`, `field_body: "x"`, `field_body_formatted: "<p>x</p>"`, `field_media_formatted: "1 image"`, `_formatted: "bare"`
  - `formatted-orphan/data/node.article.yml`: id "1", `title: "A"`, `field_teaser_formatted: "Short"`
  - `formatted-non-string/data/node.article.yml`: id "1", `title: "A"`, `field_body: "x"`, `field_body_formatted: 3`

**Interfaces:**
- Produces: `export const FORMATTED_SUFFIX = '_formatted'` and `export function formattedBase(name: string): string | undefined`. It returns `name` without the suffix when `name` ends with it and the rest is non-empty, and `undefined` otherwise.

- [ ] **Step 1: Write the failing tests** in `data.test.ts`:

```ts
it('accepts a string _formatted companion of a declared field', () => {
  const r = validateData(validDataModel, resolve(fixtures, 'formatted-companion', 'data'));
  expect(r.errors).toEqual([]);
  expect(r.valid).toBe(true);
  // only the bare "_formatted" key (empty base) keeps the old unknown-field warning
  expect(r.warnings).toEqual([expect.stringContaining('Field "_formatted"')]);
});

it('rejects a _formatted companion without a declared base field', () => {
  const r = validateData(validDataModel, resolve(fixtures, 'formatted-orphan', 'data'));
  expect(r.valid).toBe(false);
  expect(r.errors).toEqual([
    'Field "field_teaser_formatted" on node.article id=1 has no declared base field "field_teaser"',
  ]);
});

it('rejects a non-string _formatted companion', () => {
  const r = validateData(validDataModel, resolve(fixtures, 'formatted-non-string', 'data'));
  expect(r.valid).toBe(false);
  expect(r.errors).toEqual(['Field "field_body_formatted" on node.article id=1 must be a string']);
});
```

Add one unit test for `formattedBase`: `formattedBase('created_formatted') === 'created'`, `formattedBase('_formatted') === undefined`, `formattedBase('created') === undefined`.

- [ ] **Step 2: Run them and confirm they fail.**
Run: `pnpm --filter storybook-addon-designbook exec vitest run src/validation/__tests__/data.test.ts`
Expected: the 3 new cases FAIL (the warnings appear instead of errors). The helper test fails with a missing module.

- [ ] **Step 3: Implement.** Write `formattedBase` in `shared/formatted-field.ts`. In `data.ts`, when `field` is not in `dmFields` but has a base, apply the checks in order: a base not in `dmFields` gives the orphan error; a value that is not a string gives the non-string error; otherwise `continue` silently. A key with no base keeps the existing warning.

- [ ] **Step 4: Run the file again.** Expected: all PASS, existing cases unchanged.

- [ ] **Step 5: Commit** — `feat(validation): accept _formatted sample-data companions`

### Task 2: Field-map planner accepts companion bindings (AC-3, AC-4)

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow/plan-composition.ts:490-498`, the `rec.bindings.forEach` field lookup
- Test: `packages/storybook-addon-designbook/src/__tests__/plan-composition.test.ts` and `packages/storybook-addon-designbook/src/workflow/__tests__/plan-composition-result.test.ts`

**Interfaces:**
- Consumes: `formattedBase` from Task 1.
- Behaviour: inside the loop, compute `known = b.field in fields || (base !== undefined && base in fields)`, where `base = formattedBase(b.field)`. A companion's `field` def is `{ type: 'string' }`. Every existing `b.field in fields` guard in this loop uses `known`. `compilePlannedMapping` is unchanged.

- [ ] **Step 1: Write the failing tests.** They follow the existing `accepts a string field bound to a slot` test, using the signage fixture (`field_paragraph_style` is a declared string field; `field_signage_item` is a reference).

In `plan-composition.test.ts`:

```ts
it('accepts a _formatted companion of a declared field as slot and prop', async () => {
  // add slot kicker as in the neighbouring test; push both bindings
  bindings.push({ field: 'field_paragraph_style_formatted', slot: 'kicker' });
  const { plan, errors } = await buildPlan(list, vueOpts);
  expect(errors).toEqual([]);
  expect(renderCompositionTree(deriveComposition(plan!).tree)).toContain('slot kicker ← field_paragraph_style_formatted');
});

it('rejects a _formatted companion whose base is undeclared', async () => {
  bindings.push({ field: 'field_nope_formatted', slot: 'kicker' });
  const { plan, errors } = await buildPlan(list, vueOpts);
  expect(plan).toBeNull();
  expect(errors.join('\n')).toMatch(/unknown field field_nope_formatted/);
});

it('rejects an entity descriptor on a _formatted companion', async () => {
  bindings.push({ field: 'field_signage_item_formatted', slot: 'kicker',
    entity: { entity_type: 'paragraph', bundle: 'signage_item', view_mode: 'default' } });
  const { errors } = await buildPlan(list, vueOpts);
  expect(errors.join('\n')).toMatch(/field_signage_item_formatted is not a reference field/);
});
```

In `plan-composition-result.test.ts`, add `compiles a _formatted companion as a direct field expression`. Use slot `kicker` with `field_paragraph_style_formatted` and expect `'"kicker": $fields.field_paragraph_style_formatted'`. Also use a prop binding to a string prop of the signage contract (pick one the fixture declares) and expect `$fields.field_paragraph_style_formatted` in `props`.

- [ ] **Step 2: Run and confirm they fail.**
Run: `pnpm --filter storybook-addon-designbook exec vitest run src/__tests__/plan-composition.test.ts src/workflow/__tests__/plan-composition-result.test.ts`
Expected: the accept/compile cases FAIL with `unknown field field_paragraph_style_formatted`.

- [ ] **Step 3: Implement the `known` / companion-def change** described under Interfaces.

- [ ] **Step 4: Run again.** Expected: all PASS.

- [ ] **Step 5: Commit** — `feat(workflow): bind _formatted companions in field-map mappings`

### Task 3: Core skill guidance (sample data and binding schema)

Load `designbook-skill-creator` first, plus its `rules/common-rules.md`, `rules/blueprint-files.md` and `rules/schema-files.md`. Resources follow common rules.

**Files:**
- Modify: `.agents/skills/designbook/skills/sample-data/resources/format.md`. Add a section `## Formatted Companions` covering: the key `<field>_formatted` next to a declared `<field>`; the value is a string in the display form the design shows; the data model never declares it; a companion with an undeclared base fails `validate data`. Include a YAML example with `field_downloads: 12400` and `field_downloads_formatted: "12,400"`.
- Modify: `.agents/skills/designbook/skills/sample-data/blueprints/sample-records.md`. Add one sentence: when a planned binding names `<field>_formatted`, write both the raw `<field>` value and its companion string (link the format section).
- Modify: `.agents/skills/designbook/design/schemas.yml` › `MappingBinding.properties.field.description`. Change it to: "Data-model field machine name, or `<field>_formatted` — the sample-data display companion of a declared field (string value)." Add example `field_downloads_formatted`.

- [ ] **Step 1:** Make the three edits.
- [ ] **Step 2:** Run `pnpm check`. Expected: PASS. Schema files are loaded by tests; confirm no schema test regressed.
- [ ] **Step 3: Commit** — `docs(sample-data): document _formatted companions`

### Task 4: Drupal integration — companion → formatter on the base field (AC-5, AC-6)

Load `designbook-skill-creator` (`rules/blueprint-files.md`, `rules/rule-files.md`, `rules/common-rules.md`) and `designbook-drupal`.

**Files:**
- Modify: `.agents/skills/designbook-drupal/data-mapping/blueprints/field-map.md`
  - New section `## Formatted Companion Binding`. A binding to `<field>_formatted` compiles like any string field (`$fields.<field>_formatted`). On export it is the display of `<field>`, not a field of its own.
  - Under `## Supported Settings` add `formatters`: a map `<field>: { type, settings }` in `view_modes.<vm>.settings`. It overrides the formatter derived for a `<field>_formatted` binding in that view mode.
- Modify: `.agents/skills/designbook-drupal/data-mapping/blueprints/layout-builder-display.md`
  - In `field_block` component: a `<field>_formatted` binding yields `id: 'field_block:<et>:<bundle>:<field>'` (the base field), placed in the binding's slot region.
  - In `formatter.type` by field type, add: `integer` → `number_integer`; `boolean` → `boolean`; `timestamp` / `created` / `changed` → `timestamp`. Add a closing line: the view mode's `settings.formatters.<field>` replaces the derived `type` and `settings`.
- Create: `.agents/skills/designbook-drupal/data-mapping/rules/formatted-companion.md`. Frontmatter is per `rule-files.md`: trigger domain `data-mapping`, filter `backend: drupal`. It is a hard constraint: a `<field>_formatted` binding never produces a `field.storage.*`, a `field.field.*`, or a placement named after the companion. Its placement is `<field>` with the derived or overridden formatter.
- Modify: `.agents/skills/designbook-drupal/SKILL.md`. List the new rule in the index next to the other data-mapping rules.

- [ ] **Step 1:** Make the edits.
- [ ] **Step 2:** Run `pnpm check`. Expected: PASS (skill-file lint and tests, if any cover these files).
- [ ] **Step 3: Commit** — `feat(drupal): map _formatted bindings to a formatter on the base field`

### Task 5: Fixture cases

Load `designbook-test` (debo-test). Follow its fixture/case conventions: overlay order, evidence contract, and how sync cases expose written config. Keep `design-entity-field-map-slots` and every existing case unmodified.

**Files:**
- Create: `fixtures/drupal-web/design-entity-formatted/designbook/data-model.yml`. This is the `design-entity-field-map-slots` release model plus `field_downloads: { type: integer, title: Downloads }`. It is layered after `design-entity-field-map-slots`, so it reuses the `release_teaser` and `list_cell` components.
- Create: `fixtures/drupal-web/cases/design-entity-formatted.yaml`
  - workflow `design-entity`, validate `none`; fixtures `[vision, tokens, css-generate, design-entity-field-map-slots, design-entity-formatted]`.
  - Prompt: map title→title; the `meta` slot holds `field_downloads_formatted` inside a `list_cell` with caption "Downloads" (value prop). Records: `r1` with `field_downloads: 12400`, `field_downloads_formatted: "12,400"`; `r2` with `980` / `"980"`. Build Storybook and `storybook check` each preview story. Use the slots case as the template.
  - Asserts:
    - the workflow completed with no pending workflows;
    - both rows carry `field_downloads` (number) and `field_downloads_formatted` (string);
    - the mapping source contains `$fields.field_downloads_formatted` and no `$fields.field_downloads` that isn't followed by `_formatted`;
    - `mappingResults` for r1 holds a `list_cell` with `props.value === "12,400"`;
    - the component hashes are unchanged (copy them from the slots case).
- Create: `fixtures/drupal-web/sync-formatted/`, holding `designbook/data-model.yml`, `designbook/data/node.release.yml`, `designbook/entity-mapping/node.release.full.jsonata`, and `components/` (`release_teaser`, `list_cell`, copied from the slots fixture).
  - Model: `node.release` with `title`, `field_downloads` (integer) and `field_rating` (integer). `view_modes.full`: `template: field-map`, `settings.formatters.field_rating: { type: number_unformatted, settings: {} }`.
  - The mapping binds `$fields.field_downloads_formatted` and `$fields.field_rating_formatted` into the `meta` slot.
- Create: `fixtures/drupal-web/cases/sync-node-formatted.yaml`
  - `config: layout-builder.yml`; fixtures `[vision, tokens, css-generate, sync-formatted]`. The prompt runs `/debo sync-to` for `node.release`, filtered to `entity_type=node`, and runs `drush config:import`.
  - `expected_config`: `node.type.release`, `field.storage.node.field_downloads`, `field.storage.node.field_rating`, the two `field.field.node.release.*` entries, `core.entity_view_display.node.release.full`.
  - Asserts on the written display YAML:
    - a `field_block:node:release:field_downloads` component with `formatter.type: number_integer` (derived);
    - a `field_block:node:release:field_rating` component with `formatter.type: number_unformatted` (override);
    - no written config name or file contains `_formatted`;
    - config import succeeded.

- [ ] **Step 1:** Author both fixtures and cases.
- [ ] **Step 2:** Run `pnpm check`. Expected: PASS.
- [ ] **Step 3: Commit** — `test(fixtures): cover _formatted companions in design-entity and sync-to`

### Task 6: Validation runs (AC-7, AC-8)

Follow the WORKFLOW.md provision row: call `provision_up` with profile `drupal-fixture` once per worktree, because both suites have a `drupal` backend.

- [ ] `pnpm check` → PASS.
- [ ] `debo-test run drupal-web design-entity-formatted` → every assert passes (AC-1, AC-3, AC-4).
- [ ] `debo-test run drupal-web sync-node-formatted` → every assert passes; this needs `runtime:system` (AC-5, AC-6).
- [ ] `debo-test run drupal-petshop sample-data` and `debo-test run drupal-web design-entity-field-map-slots` → still pass (AC-7).
- [ ] Record each command, its result and the tested commit SHA in the coding handoff.
