# prepare:/generator: Engine Primitives — Implementation Plan (Plan 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two backend-neutral result-declaration keys to the Designbook workflow engine — `prepare: {cmd, as}` (run a command before a result is validated, capture stdout as a JSON Schema, and validate the result against it) and `generator: {jsonata: <path>}` (declare that the result is produced by an author-then-run jsonata artifact persisted at `<path>`).

**Architecture:** Extend `ResultDeclaration` (parse) → `expandResultDeclarations` (interpolate templates) → `TaskResult` (carry metadata). At result submission (`workflowResult` → `validateResultEntry`), a `prepare` hook runs the (interpolated) command via `execSync`, parses stdout as JSON Schema, and sets it as the result's AJV validation schema — so the produced result is validated against the freshly-fetched schema. `generator` is plan-time metadata surfaced to the agent + an optional artifact-exists check at submission. No backend/drush knowledge in the engine — the command strings come from skill task frontmatter.

**Tech Stack:** TypeScript, vitest, AJV (existing), `execSync` (existing in validation-registry), the existing `interpolate()` template engine. Package: `packages/storybook-addon-designbook`.

## Global Constraints

- **Backend-neutral.** The engine must contain NO drush/Drupal knowledge. `prepare.cmd` is an opaque command string (like existing `cmd:` validators). Tests use a FAKE command (a stub script echoing a known JSON Schema) — no Drupal. (Spec Non-Goals.)
- **`pnpm check` before commit** — typecheck → lint → test (fail-fast). Auto-fix: `pnpm --filter storybook-addon-designbook lint:fix`.
- **Schema-first:** `prepare` makes the result's validation schema the authoritative (runtime-fetched) one — refinement of the spec's `schema:prepared` wording (no such validator exists; `prepare` sets the AJV schema directly).
- **No backwards-compat/migration code.**
- **`.claude/skills/` is a symlink to `.agents/skills/`** — edit only `.agents/skills/`; load `designbook-skill-creator` before editing any `.agents/skills/designbook*/` file.

---

## Plan Split (roadmap)

1. ✅ Unified Drupal-layout workspace + backend command config (done, PR #114).
2. **`prepare:`/`generator:` engine primitives** — THIS PLAN. Backend-neutral, fake-command tested.
3. **Migrate sync tasks to schema-driven generation** — `prepare`+`generator` on the `export-<unit>` tasks; `designbook-drupal` overrides declare the real backend commands; retire static `to_drupal`. Own plan doc.

---

## Engine integration map (verified)

| Concern | File | Line | Symbol |
|---|---|---|---|
| Result declaration type | `src/workflow-resolve.ts` | 67–78 | `ResultDeclaration` |
| Result expansion (interpolate) | `src/workflow-resolve.ts` | 1368–1552 | `expandResultDeclarations()` |
| Expanded result type | `src/workflow.ts` | 90–124 | `TaskResult` |
| Result submission + gate | `src/workflow.ts` | 1823–1968 | `workflowResult()` |
| Result validation (AJV + semantic) | `src/workflow.ts` | 1978–2036 | `validateResultEntry()` |
| `cmd:` validator (execSync + `{{file}}`) | `src/validation-registry.ts` | 128–143 | `validateByKeys()` |
| Template interpolation | `src/template/interpolate.ts` | 35–101 | `interpolate()` |
| Result-decl parse tests | `src/validators/__tests__/workflow-resolve.test.ts` | — | — |
| Result-validation tests | `src/validators/__tests__/workflow-result.test.ts` | 74–192 | — |

Confirm these against the live files before editing (line numbers may have shifted).

---

## File Structure (Plan 2)

- Modify: `src/workflow-resolve.ts` — `ResultDeclaration` (add `prepare?`, `generator?`); `expandResultDeclarations` (interpolate `prepare.cmd` + `generator.jsonata`, carry through).
- Modify: `src/workflow.ts` — `TaskResult` (add `prepare?`, `generator?`); `workflowResult`/`validateResultEntry` (run prepare → set schema; generator artifact check + surfacing).
- Create: `src/sync/__tests__/fake-schema-cmd.sh` — a stub command that echoes a fixed JSON Schema (backend-neutral test double).
- Tests: extend `src/validators/__tests__/workflow-resolve.test.ts` (parsing) and `src/validators/__tests__/workflow-result.test.ts` (prepare runtime + generator).
- Modify: `.agents/skills/designbook-skill-creator/` task-file rule/schema — permit `prepare:`/`generator:` result keys so tasks using them validate.
- Modify: `docs/superpowers/specs/2026-06-28-drupal-test-integration-schema-design.md` — note `prepare` sets the result schema (not a `schema:prepared` validator).

---

## Task 1: Parse `prepare:` / `generator:` into the result declaration

**Files:**
- Modify: `src/workflow-resolve.ts` (`ResultDeclaration` ~67–78; `expandResultDeclarations` ~1368–1552)
- Modify: `src/workflow.ts` (`TaskResult` ~90–124)
- Test: `src/validators/__tests__/workflow-resolve.test.ts`

**Interfaces:**
- Produces: `ResultDeclaration.prepare?: { cmd: string; as: string }` and `ResultDeclaration.generator?: { jsonata: string }`; the expanded result carries `prepare?: { cmd: string; as: string }` (with `cmd` interpolated) and `generator?: { jsonata: string }` (with the path interpolated). `TaskResult` gains the same two optional fields. Consumed by Tasks 2 (prepare runtime) and 3 (generator).

- [ ] **Step 1: Read the real definitions**

Open `src/workflow-resolve.ts` and confirm the exact `ResultDeclaration` field list (~67–78) and how `expandResultDeclarations` builds each expanded entry (~1368–1552, where `path` is interpolated). Open `src/workflow.ts` `TaskResult` (~90–124).

- [ ] **Step 2: Write the failing parse test**

In `workflow-resolve.test.ts` add (adapt imports to the file's existing test harness for `expandResultDeclarations`):
```ts
it('expands prepare.cmd and generator.jsonata with interpolation', async () => {
  const decls = {
    'view-mode-config': {
      prepare: { cmd: '{{ backend_cmd.schema_cmd }} core.entity_view_display.node.article.teaser', as: 'prepared' },
      generator: { jsonata: '$DESIGNBOOK_DATA/sync/{{ slice.bundle }}.jsonata' },
    },
  };
  const params = { backend_cmd: { schema_cmd: 'fake-schema' }, slice: { bundle: 'article' } };
  const out = await expandResultDeclarations(decls, {}, params, { DESIGNBOOK_DATA: '/data' });
  expect(out['view-mode-config'].prepare).toEqual({
    cmd: 'fake-schema core.entity_view_display.node.article.teaser', as: 'prepared',
  });
  expect(out['view-mode-config'].generator).toEqual({ jsonata: '/data/sync/article.jsonata' });
});
```

- [ ] **Step 3: Run → FAIL**

Run: `pnpm --filter storybook-addon-designbook test workflow-resolve`
Expected: FAIL — `prepare`/`generator` undefined on the expanded entry.

- [ ] **Step 4: Implement parsing + expansion**

In `ResultDeclaration` add `prepare?: { cmd: string; as: string }` and `generator?: { jsonata: string }`. In `expandResultDeclarations`, when present, set on the expanded entry: `prepare: { cmd: await interpolate(decl.prepare.cmd, params, {envMap}), as: decl.prepare.as }` and `generator: { jsonata: await interpolate(decl.generator.jsonata, params, {envMap}) }`. Add the same two optional fields to `TaskResult` in `workflow.ts`. Ensure these keys are NOT treated as inline JSON-Schema properties (exclude them where other reserved keys like `path`/`validators` are excluded).

- [ ] **Step 5: Run → PASS + check**

Run: `pnpm --filter storybook-addon-designbook test workflow-resolve` → PASS. Then `pnpm check`.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-resolve.ts packages/storybook-addon-designbook/src/workflow.ts packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts
git commit -m "feat(engine): parse prepare/generator result-declaration keys"
```

---

## Task 2: `prepare:` runtime — fetch schema, validate result against it

**Files:**
- Create: `src/sync/__tests__/fake-schema-cmd.sh`
- Modify: `src/workflow.ts` (`validateResultEntry` ~1978–2036, and/or `workflowResult` ~1823–1968)
- Test: `src/validators/__tests__/workflow-result.test.ts`

**Interfaces:**
- Consumes: `TaskResult.prepare = { cmd, as }` from Task 1.
- Produces: before a result is AJV-validated, if `prepare` is set, the engine runs `prepare.cmd` (`execSync`, capturing stdout), parses stdout as JSON Schema, and uses it as the result's validation schema. A result conforming to the fetched schema validates; a non-conforming one fails with the AJV error. A failing `prepare.cmd` (non-zero exit) makes the result invalid with the command's stderr.

- [ ] **Step 1: Add the fake command (backend-neutral test double)**

Create `src/sync/__tests__/fake-schema-cmd.sh`:
```bash
#!/usr/bin/env bash
# Test double for a `prepare` command: echoes a fixed JSON Schema on stdout,
# ignoring its args. Stands in for a real `drush ... config-schema` call.
cat <<'JSON'
{ "type": "object", "required": ["config_name", "data"],
  "properties": {
    "config_name": { "type": "string" },
    "data": { "type": "object", "required": ["langcode"],
              "properties": { "langcode": { "type": "string" } } } },
  "additionalProperties": true }
JSON
```
Make it executable: `chmod +x src/sync/__tests__/fake-schema-cmd.sh`.

- [ ] **Step 2: Write the failing runtime tests**

In `workflow-result.test.ts` add (adapt to the file's existing `validateResultEntry`/`workflowResult` harness; resolve the fake script path relative to the test file):
```ts
const FAKE = require('path').resolve(__dirname, '../../sync/__tests__/fake-schema-cmd.sh');

it('prepare: validates the result against the fetched schema (conforming → valid)', async () => {
  const entry = { prepare: { cmd: `bash ${FAKE}`, as: 'prepared' }, submission: 'data' as const };
  const value = { config_name: 'node.type.article', data: { langcode: 'en' } };
  const r = await validateResultEntry(entry, value, {}, {}, 'data');
  expect(r.valid).toBe(true);
});

it('prepare: rejects a result missing a fetched-schema-required key', async () => {
  const entry = { prepare: { cmd: `bash ${FAKE}`, as: 'prepared' }, submission: 'data' as const };
  const value = { config_name: 'node.type.article', data: {} }; // missing data.langcode
  const r = await validateResultEntry(entry, value, {}, {}, 'data');
  expect(r.valid).toBe(false);
  expect(r.error).toMatch(/langcode/);
});

it('prepare: a failing command makes the result invalid', async () => {
  const entry = { prepare: { cmd: 'false', as: 'prepared' }, submission: 'data' as const };
  const r = await validateResultEntry(entry, { any: 1 }, {}, {}, 'data');
  expect(r.valid).toBe(false);
});
```

- [ ] **Step 3: Run → FAIL**

Run: `pnpm --filter storybook-addon-designbook test workflow-result`
Expected: FAIL — prepare not run; schema not applied.

- [ ] **Step 4: Implement the prepare hook**

In `validateResultEntry` (before the AJV validation block, ~line 1988), add: if `entry.prepare` is set, run the command and use its stdout as the schema:
```ts
if (entry.prepare) {
  try {
    const out = execSync(entry.prepare.cmd, { timeout: 30_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    entry = { ...entry, schema: JSON.parse(out) };   // fetched schema becomes the validation schema
  } catch (err: any) {
    return { valid: false, error: `prepare command failed: ${err.stderr ?? err.message}`, last_validated: new Date().toISOString() };
  }
}
```
Import `execSync` (mirror validation-registry's import). The subsequent AJV block validates the data against `entry.schema` as it already does. (If `validateResultEntry` is sync, make the prepare path consistent with how the function returns; keep it synchronous via `execSync`.)

- [ ] **Step 5: Run → PASS + check**

Run: `pnpm --filter storybook-addon-designbook test workflow-result` → PASS (all three). Then `pnpm check`.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow.ts packages/storybook-addon-designbook/src/sync/__tests__/fake-schema-cmd.sh packages/storybook-addon-designbook/src/validators/__tests__/workflow-result.test.ts
git commit -m "feat(engine): prepare hook runs command and validates result against fetched schema"
```

---

## Task 3: `generator:` — surface to the agent + artifact-exists check

**Files:**
- Modify: `src/workflow.ts` (`workflowResult` ~1823–1968; and where the task's result expectation is surfaced to the agent — find via `grep -n "generator\|description\|next" src/workflow.ts` and the CLI `workflow next` path)
- Test: `src/validators/__tests__/workflow-result.test.ts`

**Interfaces:**
- Consumes: `TaskResult.generator = { jsonata }` from Task 1.
- Produces: (a) the generator path is surfaced in the task's result expectation so the agent knows to author + run the jsonata there; (b) at result submission, if `generator` is set, the engine verifies the jsonata artifact exists at `generator.jsonata` — a missing artifact makes the result invalid (the durable transform must be persisted). No execution of the jsonata by the engine (the agent runs it to produce the submitted result).

- [ ] **Step 1: Write the failing test**

```ts
it('generator: result is invalid when the jsonata artifact is missing', async () => {
  const entry = { generator: { jsonata: '/tmp/does-not-exist-xyz.jsonata' }, submission: 'data' as const,
                  schema: { type: 'object' } };
  const r = await validateResultEntry(entry, {}, {}, {}, 'data');
  expect(r.valid).toBe(false);
  expect(r.error).toMatch(/generator|jsonata|artifact/i);
});

it('generator: result is valid when the artifact exists and data matches schema', async () => {
  const fs = require('fs'); const os = require('os'); const path = require('path');
  const p = path.join(os.tmpdir(), `gen-${process.pid}.jsonata`);
  fs.writeFileSync(p, '$'); // any persisted transform
  const entry = { generator: { jsonata: p }, submission: 'data' as const, schema: { type: 'object' } };
  const r = await validateResultEntry(entry, {}, {}, {}, 'data');
  expect(r.valid).toBe(true);
  fs.unlinkSync(p);
});
```

- [ ] **Step 2: Run → FAIL**

Run: `pnpm --filter storybook-addon-designbook test workflow-result`
Expected: FAIL — generator artifact not checked.

- [ ] **Step 3: Implement the artifact check + surfacing**

In `validateResultEntry`, after the prepare hook and before/with the AJV block: if `entry.generator?.jsonata` is set and `!existsSync(entry.generator.jsonata)`, return `{ valid: false, error: 'generator artifact missing: ' + entry.generator.jsonata, last_validated: ... }`. Import `existsSync` from `fs`.

For surfacing: where the task's result expectation is rendered to the agent (the result `description`/instructions in the `workflow next` output), include a line when `generator` is set, e.g. `Produce this result by authoring a JSONata at {{generator.jsonata}} and running it.` Find the exact rendering site and add it (keep it data-driven, no Drupal specifics).

- [ ] **Step 4: Run → PASS + check**

Run: `pnpm --filter storybook-addon-designbook test workflow-result` → PASS. Then `pnpm check`.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow.ts packages/storybook-addon-designbook/src/validators/__tests__/workflow-result.test.ts
git commit -m "feat(engine): generator surfacing + jsonata artifact-exists check"
```

---

## Task 4: Permit `prepare:`/`generator:` in skill task-file validation

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/` — the task-file rule/schema that validates a task's `result:` keys (find it: `grep -rln "validators\|submission\|result" .agents/skills/designbook-skill-creator/rules .agents/skills/designbook-skill-creator/resources`)

**Interfaces:**
- Produces: the skill-creator validator accepts `prepare:` and `generator:` as known result-property keys, so a task declaring them passes validation (today unknown keys may be flagged or treated as inline schema).

- [ ] **Step 1: Load skill-creator**

Invoke `designbook-skill-creator`; read `rules/task-files.md` (and `rules/schema-files.md`, `rules/common-rules.md`). Identify where result-property keys (`path`, `$ref`, `validators`, `submission`, `flush`) are enumerated/validated.

- [ ] **Step 2: Add the two keys**

Add `prepare` (`{ cmd: string, as: string }`) and `generator` (`{ jsonata: string }`) to the recognized result-property keys, with a one-line description each (prepare = runtime schema via opaque command; generator = author-then-run jsonata artifact at a path). Keep it backend-neutral (no drush mention).

- [ ] **Step 3: Validate**

Run the skill-creator validator over the edited rule file → zero errors. Add/point a small fixture task that declares `prepare`+`generator` and confirm it validates (if the skill-creator has a validation harness). `touch` the edited file.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook-skill-creator/
git commit -m "feat(skill-creator): permit prepare/generator result-declaration keys"
```

---

## Task 5: End-to-end engine integration test

**Files:**
- Test: `src/sync/__tests__/prepare-generator.e2e.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: a test that drives a synthetic task result through the real expand → submit → validate path with `prepare` (fake cmd) + `generator` (temp artifact), proving the wiring end-to-end: a conforming result with the artifact present validates; a non-conforming result (or missing artifact) fails.

- [ ] **Step 1: Write the e2e test**

```ts
import { describe, it, expect } from 'vitest';
// import expandResultDeclarations, validateResultEntry from their modules
const path = require('path'); const fs = require('fs'); const os = require('os');
const FAKE = path.resolve(__dirname, 'fake-schema-cmd.sh');

it('prepare+generator: end-to-end conforming result validates', async () => {
  const artifact = path.join(os.tmpdir(), `e2e-${process.pid}.jsonata`);
  fs.writeFileSync(artifact, '$');
  const decls = { cfg: { prepare: { cmd: `bash ${FAKE}`, as: 'prepared' }, generator: { jsonata: artifact } } };
  const expanded = await expandResultDeclarations(decls, {}, {}, {});
  const r = await validateResultEntry(expanded.cfg, { config_name: 'x', data: { langcode: 'en' } }, {}, {}, 'data');
  expect(r.valid).toBe(true);
  fs.unlinkSync(artifact);
});

it('prepare+generator: missing artifact fails even if data matches schema', async () => {
  const decls = { cfg: { prepare: { cmd: `bash ${FAKE}`, as: 'prepared' }, generator: { jsonata: '/tmp/nope.jsonata' } } };
  const expanded = await expandResultDeclarations(decls, {}, {}, {});
  const r = await validateResultEntry(expanded.cfg, { config_name: 'x', data: { langcode: 'en' } }, {}, {}, 'data');
  expect(r.valid).toBe(false);
});
```

- [ ] **Step 2: Run → iterate to PASS**

Run: `pnpm --filter storybook-addon-designbook test prepare-generator.e2e`
Expected: PASS (both). Then `pnpm check`.

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/sync/__tests__/prepare-generator.e2e.test.ts
git commit -m "test(engine): end-to-end prepare+generator validation"
```

---

## Task 6: Update the spec to match the implemented semantics

**Files:**
- Modify: `docs/superpowers/specs/2026-06-28-drupal-test-integration-schema-design.md`

**Interfaces:**
- Produces: the spec's Part B reflects reality — `prepare` SETS the result's validation schema (AJV), there is no `schema:prepared` validator; `validate_cmd` stays a normal `cmd:` validator; `generator` adds an artifact-exists check + agent surfacing.

- [ ] **Step 1: Edit the example + prose**

In the result-declaration example, replace `validators: ["schema:prepared", …]` with: the prepared schema is applied by `prepare` itself (the result is AJV-validated against it); keep `validators: ["cmd:{{ backend_cmd.validate_cmd }} {{ file }}"]` as the authoritative backend cross-check. Note `generator` requires the jsonata artifact to exist at submission.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-06-28-drupal-test-integration-schema-design.md
git commit -m "docs: prepare sets the result schema (no schema:prepared validator); generator artifact check"
```

---

## Self-Review (Plan 2)

- **Spec coverage (Part B engine primitives):** `prepare` parse (T1) + runtime schema fetch & validate (T2); `generator` parse (T1) + surfacing + artifact check (T3); skill-creator permits the keys (T4); e2e wiring (T5); spec reconciled (T6). Backend-neutral throughout (fake command, no Drupal). The Drupal-side `prepare.command`/`validate_cmd` realizations + migrating real sync tasks are Plan 3.
- **Placeholder scan:** test code is concrete; the one "find the exact rendering site" in T3 Step 3 names the grep to locate it (not a vague TODO) because the surfacing channel must be confirmed against the live `workflow next` code. Line numbers are marked "confirm against live files."
- **Type consistency:** `prepare: { cmd, as }` and `generator: { jsonata }` identical across `ResultDeclaration` (T1), `TaskResult` (T1), the runtime hook (T2/T3), and tests (T2/T3/T5). `validateResultEntry(entry, value, schemas, config, kind)` signature reused from the map. `fake-schema-cmd.sh` path consistent (T2 creates, T5 reuses).
- **Open confirmation:** whether `validateResultEntry` is sync or async governs how the prepare `execSync` result is threaded — confirm in T2 Step 1 and keep the hook synchronous (execSync) to match.
