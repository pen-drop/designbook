# Skill-extensible `build_form` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any loaded skill register a new `sync-to` scene-branch `build_form` value by widening the `ConfigNameUnit.build_form` enum from its own frontmatter, with no edit inside the designbook addon or its plugin cache.

**Architecture:** Add a narrow additive **enum-union** case to the addon's schema-merge (`deepMergeExtends`): when an existing property and an incoming property both carry an `enum` array, union the members instead of throwing `Schema extends conflict`. `build_form` stays a validated closed set that skills widen. The scene-branch dispatch needs **no logic change** — `build_form` is already taken identically from the page bundle's full view-mode `template` (open string), and `transform.md` already selects the expanding blueprint by `trigger.config_name` glob — only the closed-enum prose is generalized and the mechanism documented.

**Tech Stack:** TypeScript (Vitest) for the addon; Markdown skill files (`.agents/skills/**`) authored via `designbook-skill-creator`; `debo-test` tester for end-to-end.

## Global Constraints

- **No migration / backwards-compat / legacy-artifact code** — existing on-disk artifacts are disposable; update writer/reader to the new shape only (CLAUDE.md).
- **`pnpm check`** (typecheck → lint → test, fail-fast) must be green before any commit that touches the addon/TS; run from the repo root.
- **Before creating OR editing any task/rule/blueprint/workflow/`schemas.yml` under `.agents/skills/designbook*/`, load `designbook-skill-creator` first** (CLAUDE.md) — binding for every `work:docs` task here.
- **`.agents/skills/` is canonical**; `.claude/skills/` is a symlink — never edit the symlink side.
- Enum-union is **additive only**: base order preserved, new members appended, deduplicated. It fires **only** when both sides carry an `enum` array; every other collision is unchanged.
- Run `debo-test` **from inside this git worktree** (isolated `workspaces/`).
- Addon source: `packages/storybook-addon-designbook/`.

---

### Task 1: Additive enum-union in `deepMergeExtends` (`work:code`)

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-schema-merge.ts:128-165` (the `deepMergeExtends` `propName in target.properties` branch)
- Test: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-merge.test.ts` (add to `describe('deepMergeExtends')`, near line 81)

**Interfaces:**
- Consumes: `deepMergeExtends(target: JsonSchema, source: Record<string, unknown>, sourcePath: string): void` (existing signature, unchanged).
- Produces: unioned `target.properties[propName].enum` when both sides are enum leaves; identical throw/recurse behavior otherwise. No signature change — later tasks and callers are unaffected.

- [ ] **Step 1: Write the failing tests**

Add to `describe('deepMergeExtends', …)`:

```ts
it('unions enum members on an existing enum-leaf property', () => {
  const target = { type: 'object', properties: { build_form: { type: 'string', enum: ['layout-builder', 'canvas'] } } };
  deepMergeExtends(target, { properties: { build_form: { enum: ['views-page'] } } }, 'ext.md');
  const props = target.properties as Record<string, { enum?: unknown[] }>;
  expect(props.build_form!.enum).toEqual(['layout-builder', 'canvas', 'views-page']);
});

it('deduplicates when unioning enum members already present', () => {
  const target = { type: 'object', properties: { build_form: { type: 'string', enum: ['layout-builder', 'canvas'] } } };
  deepMergeExtends(target, { properties: { build_form: { enum: ['canvas', 'views-page'] } } }, 'ext.md');
  const props = target.properties as Record<string, { enum?: unknown[] }>;
  expect(props.build_form!.enum).toEqual(['layout-builder', 'canvas', 'views-page']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-schema-merge`
Expected: FAIL — the two new tests throw `Schema extends conflict: property 'build_form' already exists`. The existing `still errors on duplicate leaf properties` test still PASSES.

- [ ] **Step 3: Add the enum-union case**

In `deepMergeExtends`, inside `if (propName in target.properties) {`, **before** the structural-recurse guard, insert:

```ts
// Additive enum-union: a loaded skill widens a closed enum leaf (e.g. build_form).
// Fires only when both sides carry an enum array; base order preserved, new members
// appended, deduplicated. Every other collision falls through to recurse/throw below.
if (
  existing && typeof existing === 'object' &&
  incoming && typeof incoming === 'object' &&
  Array.isArray((existing as JsonSchema).enum) &&
  Array.isArray((incoming as JsonSchema).enum)
) {
  const base = (existing as JsonSchema).enum as unknown[];
  const add = (incoming as JsonSchema).enum as unknown[];
  (existing as JsonSchema).enum = [...base, ...add.filter((v) => !base.includes(v))];
  continue;
}
```

(`existing` and `incoming` are already destructured in the surrounding block.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-schema-merge`
Expected: PASS — new union tests green; `adds new properties`, `errors on duplicate property names`, `still errors on duplicate leaf properties`, `recursively merges …` all still green.

- [ ] **Step 5: `pnpm check`**

Run: `pnpm check`
Expected: typecheck → lint → test all green.

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow-schema-merge.ts packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-merge.test.ts
git commit -m "DESIGNBOOK-46: additive enum-union in deepMergeExtends"
```

---

### Task 2: End-to-end `computeMergedSchema` widening test (`work:code`)

**Files:**
- Test: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-merge.test.ts` (add to `describe('computeMergedSchema')`, near line 261 `merges extends from a rule`)

**Interfaces:**
- Consumes: `computeMergedSchema(baseResult, input: MergeInput): Record<string, object> | undefined` and the existing test's temp-rule-file helper (mirror the setup used by `merges extends from a rule`).
- Produces: proof that a rule widening `ConfigNameUnit.properties.build_form.enum` yields `[layout-builder, canvas, views-page]` in the merged result schema.

- [ ] **Step 1: Write the failing test**

Mirror the existing `merges extends from a rule` setup (base result schema with a `build_form` enum leaf `[layout-builder, canvas]`; a temp rule file whose frontmatter `extends:` the result key's `build_form.enum: [views-page]`), then:

```ts
it('widens a build_form enum additively from a rule (DESIGNBOOK-46)', () => {
  // base result schema: ConfigNameUnit with build_form enum [layout-builder, canvas]
  // rule frontmatter: extends: { <key>: { properties: { build_form: { enum: [views-page] } } } }
  const merged = computeMergedSchema(baseResult, input);
  const schema = merged!['units'] as { properties: { build_form: { enum: unknown[] } } };
  expect(schema.properties.build_form.enum).toEqual(['layout-builder', 'canvas', 'views-page']);
});
```

Use the actual result-key / definition name the `sync-to` `resolve-filter` task uses for `ConfigNameUnit` (verify against `schemas.yml` + `resolve-filter.md` `result:` — likely keyed via `refMap` to `ConfigNameUnit`); adjust `baseResult`/`refMap` in the test setup to match the existing composition tests' shape.

- [ ] **Step 2: Run test to verify it fails, then passes**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-schema-merge`
Expected: with Task 1 merged, this test should already **PASS** (Task 1 fixed the underlying merge). If it FAILS, the failure localizes a `findExtEntry`/`refMap` keying gap in composition — fix in this task, not Task 1.

- [ ] **Step 3: `pnpm check`**

Run: `pnpm check`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-merge.test.ts
git commit -m "DESIGNBOOK-46: computeMergedSchema build_form widening coverage"
```

---

### Task 3: Generalize dispatch prose + `build_form` description (`work:docs`)

**REQUIRED FIRST:** load `designbook-skill-creator` (editing `schemas.yml` + a task file under `.agents/skills/designbook/`).

**Files:**
- Modify: `.agents/skills/designbook/skills/sync-to/tasks/resolve-filter.md:111,118` (the "Build form (declarative, not guessed)" block and the "delegated to the `layout-builder`/`canvas` blueprints" line)
- Modify: `.agents/skills/designbook/skills/sync-to/schemas.yml:147-155` (`build_form.description`)

**Interfaces:**
- Consumes: nothing (prose + schema description only).
- Produces: the documented, non-closed framing later docs (Task 4) cross-reference.

- [ ] **Step 1: Load skill-creator**

Invoke `designbook-skill-creator`; read `rules/task-files.md` and `rules/schema-files.md`.

- [ ] **Step 2: Reframe `resolve-filter.md` build-form prose**

Rewrite the closed `layout-builder ⇒ Layout Builder; canvas ⇒ Display Builder` branch as: `build_form` is the page bundle's full view-mode `template` value; the two shipped forms (`layout-builder`, `canvas`) are the **built-in registrations**; a project skill registers a third by **widening `ConfigNameUnit.build_form`** (via `extends:` enum-union) and shipping the expanding blueprint, selected by its `trigger.config_name` glob. Keep the per-form unit lists and the "WHAT here, HOW there" delegation, but phrase the delegation as "the build form's blueprint" rather than naming only the two shipped ones. Do not restate ordering.

- [ ] **Step 3: Update `build_form.description` in `schemas.yml`**

Note the enum is **skill-extensible** (a loaded skill may widen it via `extends:` enum-union), not a fixed `[layout-builder, canvas]` pair. Leave `enum: [layout-builder, canvas]` (the shipped set) unchanged.

- [ ] **Step 4: Validate config-load**

Run: `pnpm --filter storybook-addon-designbook test -- schema` (or the skill/schema loader test the addon runs) and confirm the `sync-to` schema still loads and `resolve-filter` still parses.
Expected: PASS; `git diff` shows only the intended prose/description edits.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/skills/sync-to/tasks/resolve-filter.md .agents/skills/designbook/skills/sync-to/schemas.yml
git commit -m "DESIGNBOOK-46: generalize scene-branch build_form dispatch prose"
```

---

### Task 4: Document the enum-union mechanism where authors look (`work:docs`, AC-6)

**REQUIRED FIRST:** load `designbook-skill-creator` (editing `rules/*.md`, `resources/*.md`, a `SKILL.md`).

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/rules/rule-files.md:143-148` (the operations table)
- Modify: `.agents/skills/designbook/resources/schema-composition.md` (the merge-model section)
- Modify: `.agents/skills/designbook/resources/workflow-execution.md` (cross-reference)
- Modify: `.agents/skills/designbook/skills/sync-to/SKILL.md` (cross-reference to registering a build form)

**Interfaces:**
- Consumes: the mechanism from Tasks 1 + 3.
- Produces: the AC-6 author-facing documentation surface.

- [ ] **Step 1: Load skill-creator**

Invoke `designbook-skill-creator`; read `rules/rule-files.md` and `rules/common-rules.md`.

- [ ] **Step 2: Update the operations table (`rule-files.md`)**

Change the `extends:` row `Effect` to: `Add new properties (error on duplicate); union enum members on an existing enum-leaf property`. Keep `constrains:` = "Intersect enum values". Add a one-line note distinguishing **union** (`extends`, widen) from **intersect** (`constrains`, narrow).

- [ ] **Step 3: Document the union rule (`schema-composition.md`)**

In the merge-model description, state: when `extends:` targets an existing property and both the base and incoming carry an `enum` array, the members are unioned (base order preserved, new appended, deduplicated); non-enum leaf duplicates still error; structural schemas still recurse. Give the `build_form` widening as the worked example.

- [ ] **Step 4: Cross-reference (`workflow-execution.md` + `sync-to/SKILL.md`)**

Add a short pointer in `workflow-execution.md` and `sync-to/SKILL.md`: a project registers a scene-branch build form by widening `ConfigNameUnit.build_form` from its own rule/blueprint frontmatter (`extends:` enum-union) and shipping the expanding blueprint (matched by `trigger.config_name`) — no addon edit.

- [ ] **Step 5: Doc-structural validation**

Run:
```bash
grep -n "union enum members" .agents/skills/designbook-skill-creator/rules/rule-files.md
grep -rn "enum-union\|union enum\|build_form" .agents/skills/designbook/resources/schema-composition.md .agents/skills/designbook/resources/workflow-execution.md .agents/skills/designbook/skills/sync-to/SKILL.md
```
Expected: each surface returns the mechanism text; `git diff` shows only intended doc edits. Run the addon's skill-frontmatter/loader test if one covers these files.

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook-skill-creator/rules/rule-files.md .agents/skills/designbook/resources/schema-composition.md .agents/skills/designbook/resources/workflow-execution.md .agents/skills/designbook/skills/sync-to/SKILL.md
git commit -m "DESIGNBOOK-46: document extends enum-union / build_form registration (AC-6)"
```

---

### Task 5: End-to-end `debo-test` — register a third build form (`work:code`, AC-3/AC-7)

**Files:**
- Inspect/author: the `debo-test` fixture for a `sync` / `resolve-filter` case (under the designbook-test suite fixtures) that registers a **third** build form (a skill widening `ConfigNameUnit.build_form` + a page bundle whose full view-mode `template` is that third value + an expanding blueprint matched by `trigger.config_name`). If a fixture already exercises a scene sync, extend it; otherwise author the minimal one.

**Interfaces:**
- Consumes: the merged enum-union (Task 1) + generalized dispatch prose (Task 3).
- Produces: a passing tester run proving `resolve-filter → transform → sync` accepts and expands a skill-registered build form.

- [ ] **Step 1: Identify the suite/case**

Run `debo-test run <suite>` (no case arg) from inside this worktree to list cases; pick the `sync`/`resolve-filter` case whose fixture exercises the scene branch (confirm with the human if ambiguous).

- [ ] **Step 2: Register a third build form in the fixture**

Add a skill (rule/blueprint) to the fixture that widens `ConfigNameUnit.build_form` with a third value and ships its expanding blueprint; set a page bundle's full view-mode `template` to that value.

- [ ] **Step 3: Run the tester**

Run: `debo-test run <suite> <case> --validate <workflow>` from inside this worktree (append `--validate` only if spec's test plan recorded one; otherwise plain `debo-test run <suite> <case>`).
Expected: `workflow summary --json` shows the scene sync completing — `workflow done` result validation accepts the third `build_form`, `resolve-filter` selects it, `transform` expands it via the registering blueprint.

- [ ] **Step 4: Capture output + commit fixture**

Save the `workflow summary --json` block as coding evidence.
```bash
git add <fixture paths>
git commit -m "DESIGNBOOK-46: debo-test fixture registering a third build form (e2e)"
```

---

## Self-Review

**Spec coverage:** design §"Change 1" → Task 1 (+ Task 2 e2e merge); §"Change 2" → Task 3; §"Change 3" (AC-6) → Task 4; §"Testing" → Tasks 1,2,5 + `pnpm check`; AC-1/2/4/5 → Tasks 1+3 (external widening, base-first union, addon schema untouched); AC-3/7 → Tasks 2+5; AC-8 → Task 4 doc-structural checks. No gap.

**Placeholder scan:** the `debo-test` `<suite>`/`<case>`/`<workflow>` and fixture paths in Task 5 are resolved at execution by listing cases (Step 1) — a deliberate discover-then-act step, not a code placeholder. Task 2's exact `refMap`/result-key is pinned against the existing composition tests during the task. No prose-without-code steps in code tasks.

**Type consistency:** `deepMergeExtends(target, source, sourcePath)` and `computeMergedSchema(baseResult, input)` signatures match the current source; `existing`/`incoming` reuse the block's existing destructuring; `JsonSchema.enum` is `unknown[]` per the interface. Consistent.
