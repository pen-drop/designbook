# Reference Object + Unified Screenshot Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a design reference a first-class, stable, captured-once `Reference` object; have `extract-reference` author its `meta.yml` + baseline; unify all captures under one `Screenshot { element, state, breakpoint, selector }` schema; shrink `design-verify` to story-only capture + compare against the frozen baseline.

**Architecture:** A `Reference` object lives at `references/<hash>/meta.yml` (`<hash>` = SHA256 of source URL, first 12 hex — existing `hashReferenceUrl`). It owns `elements` (each: id, reference-side `selector`, `states`, `breakpoints`) and the baseline PNGs `<bp>--<element>--<state>.png`. A shared idempotent `ensure-baseline` task captures any missing baseline once (via PR #112 isolate-and-capture) and freezes it. `StoryMeta` (`stories/<id>/meta.yml`) shrinks to a binding: `reference: <hash>` + `elements[{id, selector}]` (story-side selector). `design-verify` captures only story PNGs and compares by `(element, state, breakpoint)`. The addon panel resolves the reference from the story binding.

**Tech Stack:** YAML schemas (`schemas.yml`), TypeScript addon (`packages/storybook-addon-designbook`, vitest), designbook skill markdown tasks/rules/workflows, `playwright-cli` isolate-and-capture.

## Global Constraints

- **Skill-creator gate (CLAUDE.md):** before editing ANY task/rule/workflow/`schemas.yml` under `.agents/skills/designbook/`, load `designbook-skill-creator` first, plus the matching per-file-type rule (`rules/schema-files.md`, `rules/task-files.md`, `rules/workflow-files.md`) and always `rules/common-rules.md`.
- **Addon-skills gate (CLAUDE.md Part 2):** before editing ANY TypeScript under `packages/storybook-addon-designbook/`, load `designbook-addon-skills` first (Tasks 2 & 3).
- **Canonical path:** edit `.agents/skills/` only; `.claude/skills/` is a symlink — never edit it, never edit the main-repo copy `/home/cw/projects/designbook/.agents/...`. Only worktree paths.
- **No backwards-compat / migration code:** existing on-disk artifacts (meta.yml, references/, screenshots) are disposable; testing is from-scratch. Update writers/readers to the new shape; do not read or upgrade old shapes.
- **Builds on PR #112** (isolate-and-capture): all screenshot capture (baseline + story) uses the isolate flow + CSR-robust settle.
- **Naming:** the named comparison subject is `element` (not `region`/`part`). Baseline + story PNG filename: `<breakpoint>--<element>--<state>.png` (rest state included literally, no empty-suffix special case).
- **Stable baseline:** capture each `(element, state, breakpoint)` once; reuse if the PNG exists; re-capture only on explicit `--refresh-reference`.
- **Reference identity:** `<hash>` = `hashReferenceUrl(url)` (sha256, first 12 hex) — existing in `resolvers/reference-folder.ts`.
- **Code-quality gate:** `pnpm check` (typecheck → lint → test, fail-fast) green before every commit. Do NOT run `pnpm install`; if `pnpm-lock.yaml` shows modified after `pnpm check`, `git checkout -- pnpm-lock.yaml` and stage only intended files.
- **Spec:** `docs/superpowers/specs/2026-06-23-reference-object-screenshot-schema-design.md`.

---

## File Structure

**Schema (1 file):**
- `.agents/skills/designbook/design/schemas.yml` — add `Screenshot`, `Element`, `Reference`; rebuild `StoryMeta`; remove `Check`, `Region`, `file_suffix`. (`RegionId` → `ElementId`.)

**Addon TS (5 files + tests):**
- `packages/storybook-addon-designbook/src/reference-entity.ts` *(new)* — `Reference` loader/model for `references/<hash>/meta.yml`.
- `packages/storybook-addon-designbook/src/story-entity.ts` — `StoryMeta` reads `{reference, elements[]}`; `toJSON()` resolves the `Reference` and returns `elements` + `referenceDir`. Delete `StoryMetaRegionJSON`/`StoryMetaBreakpointJSON`.
- `packages/storybook-addon-designbook/src/vite-plugin.ts` — `/__designbook/story` returns the resolved shape.
- `packages/storybook-addon-designbook/src/components/VisualCompareTool.tsx` — reads `elements`/`referenceElements` (not `breakpoints.regions`); the ENTIRE component (dropdown rows, status badges at lines ~171–191) drops `bp.regions` for the element list.
- `packages/storybook-addon-designbook/src/withVisualCompare.ts` — decorator reading `story.breakpoints?.[bp].regions` + `reference_selector` (lines 19, 48); rework to the element/referenceElements shape.
- Tests: `src/__tests__/story-entity.test.ts`, `src/__tests__/reference-entity.test.ts` *(new)*.

**Out of scope (cosmetic, does NOT block compile):** `resolvers/region-properties.ts`, `inspect/region.ts` (`locateRegion`, `pickRegionLabel`), and the `RegionProperties` schema keep their "region" naming — they are the element-grounding locator and do NOT depend on the removed `RegionId`. A region→element rename there is a separate follow-up.

**Skill tasks/workflows (markdown):**
- `tasks/ensure-baseline.md` *(rebuild of `capture-reference.md`)* — idempotent reference baseline capture into `references/<hash>/`.
- `tasks/extract-reference.md` — write `references/<hash>/meta.yml` (Reference) + invoke baseline capture for asked elements×breakpoints×states.
- `tasks/setup-compare.md` — write story binding + emit story-side `Screenshot` list; ensure missing baselines.
- `tasks/capture-storybook.md` — story-only capture, new filename.
- `tasks/compare-screenshots.md` — pair story vs baseline by `(element,state,breakpoint)`.
- `design/workflows/design-verify.md` — `capture`/`re-capture` stages = story-only (drop capture-reference); `reference` stage ensures baseline.
- `rules/playwright-capture.md` — filename convention `<bp>--<element>--<state>.png`; reference vs story output dirs.

Order: schema → addon model/read path → skill capture/workflow → integration. Schema is the contract; everything else consumes it.

---

### Task 1: Schema — Reference, Element, Screenshot; rebuild StoryMeta

**Files:**
- Modify: `.agents/skills/designbook/design/schemas.yml` (`Check` 105–162, `Region` 68–95, `ReferenceFolder` 96–103, `StoryMeta` 267–335; `RegionId` definition)

**Interfaces:**
- Produces: `Screenshot`, `Element`, `Reference`, rebuilt `StoryMeta`, `ElementId`. Consumed by every later task (TS reads these shapes; tasks `$ref` them).

- [ ] **Step 1: Load gate** — load `designbook-skill-creator`, read `rules/schema-files.md` + `rules/common-rules.md`. Then read `schemas.yml`.

- [ ] **Step 2: Add new schemas** (place near the old Region/Check block). `CaptureStep`/`CaptureState` anchors already exist — reuse the `*CaptureStep` anchor.

```yaml
ElementId:
  type: string
  description: Clean label for a named comparison subject (e.g. `full`, `header`, `footer`).

Screenshot:
  type: object
  title: Screenshot
  description: >
    Atomic capture descriptor — one rendered image, identical shape on the reference
    (baseline) and story sides. Identity is (element, state, breakpoint). The on-disk
    filename is derived: `<breakpoint>--<element>--<state>.png`.
  required: [element, state, breakpoint, selector]
  properties:
    element: { $ref: "#/ElementId" }
    state: { type: string, description: "rest | interaction-state name" }
    breakpoint: { $ref: "#/BreakpointId" }
    selector:
      type: string
      description: >
        CSS selector for THIS side's capture; "" ⇒ isolated root / full. Reference
        side uses the reference selector, story side the story selector — context
        (which meta) disambiguates, so there is no reference_selector/selector split.

Element:
  type: object
  title: Element
  description: >
    Named comparison subject. Carries this side's selector plus the state × breakpoint
    matrix that materializes into Screenshots.
  required: [id]
  properties:
    id: { $ref: "#/ElementId" }
    selector: { type: string, default: "" }
    states:
      type: array
      default: [{ name: rest, steps: [] }]
      items:
        type: object
        required: [name]
        properties:
          name: { type: string }
          steps: { type: array, default: [], items: *CaptureStep }
    breakpoints:
      type: array
      default: []
      items: { $ref: "#/BreakpointId" }

Reference:
  type: object
  title: Reference
  description: >
    First-class design reference, serialized to `references/<hash>/meta.yml`
    (<hash> = SHA256 of source url, first 12 hex). Owns the stable baseline: each
    (element, state, breakpoint) is captured once into `<bp>--<element>--<state>.png`
    beside this file and frozen. Accumulates across runs; re-captured only on
    explicit refresh.
  required: [source, elements]
  properties:
    source:
      type: object
      properties:
        url: { type: string }
        origin: { type: string }
        screenId: { type: string }
        hasMarkup: { type: boolean }
    elements: { type: array, items: { $ref: "#/Element" } }
    extract: { type: string, default: "extract.json", description: "Relative path to the DesignReference extract." }
    assets_dir: { type: string, default: "assets/" }
```

- [ ] **Step 3: Rebuild `StoryMeta`** — replace the 267–335 block:

```yaml
StoryMeta:
  type: object
  title: Story Meta
  description: >
    On-disk `stories/{storyId}/meta.yml` — a thin binding from a story to a Reference.
    The reference owns the elements' states/breakpoints and the baseline; the story
    supplies its own per-element selector (and optional per-state steps on the story DOM).
  required: [reference]
  properties:
    reference:
      type: string
      description: "Reference hash (SHA256 of source url, first 12 hex) — folder references/<hash>/."
    elements:
      type: array
      default: []
      items:
        type: object
        required: [id]
        properties:
          id: { $ref: "#/ElementId" }
          selector: { type: string, default: "", description: "Story-side selector; '' ⇒ isolated story (#storybook-root)." }
          states:
            type: array
            default: []
            description: "Optional per-state story steps; when absent the reference's state names are reused with empty steps."
            items:
              type: object
              required: [name]
              properties:
                name: { type: string }
                steps: { type: array, default: [], items: *CaptureStep }
```

- [ ] **Step 4: Remove obsolete schemas + finish the RegionId→ElementId rename.**
  - Delete the `Check` block (105–162), the `Region` block (68–95), and the old `RegionId` block (60–67). Keep a minimal `ReferenceFolder: { type: string }` only if `reference-folder.ts` still `$ref`s it (it resolves the folder path); otherwise remove the 96–103 block.
  - `RegionId` is also `$ref`d by the verify **score/outtake** schemas (~line 177 the per-check score block with `breakpoint`/`region`/`state`; ~line 238 + ~line 876 the "regions covered by the final compare/review pass" Score list). In each of those, rename the `region` field → `element` and point it at `#/ElementId`. These are the verify-result schemas — they must speak `element` to match the new `Screenshot`/filename model.
  - **Do NOT touch `RegionProperties` (878+) or `PropertyNode`** — they are the grounding locator's output, do not use `RegionId`, and are out of scope (see File Structure note).
  - Grep the file for `file_suffix`, `reference_selector`, `RegionId`, `#/Check`, `#/Region\b` and remove/rename every remaining occurrence (the only surviving `Region*` name should be `RegionProperties`/`Region Properties`).

- [ ] **Step 5: `pnpm check`** — Run: `pnpm check`. Expected: PASS. If a TS file fails to compile because it imports a now-removed type, that is expected and handled in Tasks 2–3 — but `schemas.yml` is YAML (not compiled), so `pnpm check` should still pass on schema-only change unless a schema-validation test asserts the old shape. If a vitest schema test fails on the old shape, note it; it is fixed in Task 2.

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook/design/schemas.yml
git commit -m "feat(schema): Reference/Element/Screenshot objects, rebuild StoryMeta, drop Check/Region/file_suffix"
```

---

### Task 2: Addon — Reference model + StoryMeta binding (story-entity.ts, reference-entity.ts)

**Files:**
- Create: `packages/storybook-addon-designbook/src/reference-entity.ts`
- Modify: `packages/storybook-addon-designbook/src/story-entity.ts` (`StoryMeta` constructor 180–200, `toJSON()` 365–389, plus the `StoryMetaData`/`StoryMetaJSON` types)
- Test: `packages/storybook-addon-designbook/src/__tests__/reference-entity.test.ts` (new), `src/__tests__/story-entity.test.ts` (update)

**Interfaces:**
- Consumes: Task 1 schemas.
- Produces:
  - `Reference.load(config, hash): Reference | null`; `reference.toJSON(): { source, elements, dir }` where `elements: Array<{id, selector, states, breakpoints}>`.
  - `StoryMeta.toJSON(): { storyId, section, storyDir, reference: string | null, referenceDir: string | null, elements: Array<{id, selector}> }`.
  - `hashReferenceUrl(url)` stays in `resolvers/reference-folder.ts` (reuse).

- [ ] **Step 0: Load gate** — load `designbook-addon-skills` before editing any addon TypeScript.

- [ ] **Step 1: Write the failing test — Reference loader** (`src/__tests__/reference-entity.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Reference } from '../reference-entity';
import { hashReferenceUrl } from '../resolvers/reference-folder';

function workspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'db-ref-'));
  const url = 'https://leando.de/';
  const hash = hashReferenceUrl(url);
  const refDir = join(dir, 'references', hash);
  mkdirSync(refDir, { recursive: true });
  writeFileSync(
    join(refDir, 'meta.yml'),
    [
      'source:',
      `  url: ${url}`,
      'elements:',
      '  - id: full',
      '    selector: app-signage',
      '    breakpoints: [xl]',
      '    states:',
      '      - { name: rest, steps: [] }',
      'extract: extract.json',
      'assets_dir: assets/',
    ].join('\n'),
  );
  return dir;
}

describe('Reference', () => {
  it('loads a reference by hash and exposes elements', () => {
    const data = workspace();
    const hash = hashReferenceUrl('https://leando.de/');
    const ref = Reference.load({ data, technology: 'html' }, hash);
    expect(ref).not.toBeNull();
    const json = ref!.toJSON();
    expect(json.source.url).toBe('https://leando.de/');
    expect(json.dir).toBe(`references/${hash}`);
    expect(json.elements).toEqual([
      { id: 'full', selector: 'app-signage', breakpoints: ['xl'], states: [{ name: 'rest', steps: [] }] },
    ]);
  });

  it('returns null for an unknown hash', () => {
    const data = workspace();
    expect(Reference.load({ data, technology: 'html' }, 'deadbeef0000')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/__tests__/reference-entity.test.ts`
Expected: FAIL — cannot find module `../reference-entity`.

- [ ] **Step 3: Implement `reference-entity.ts`** (mirror the load/parse style of `story-entity.ts`; use the same YAML parser the repo uses — check `story-entity.ts` imports, e.g. `yaml`):

```typescript
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

export interface ReferenceElement {
  id: string;
  selector: string;
  states: Array<{ name: string; steps: unknown[] }>;
  breakpoints: string[];
}

interface ReferenceData {
  source?: { url?: string; origin?: string; screenId?: string; hasMarkup?: boolean };
  elements?: Array<Partial<ReferenceElement>>;
  extract?: string;
  assets_dir?: string;
}

export interface ReferenceJSON {
  source: NonNullable<ReferenceData['source']>;
  elements: ReferenceElement[];
  dir: string;
}

export class Reference {
  private constructor(
    readonly hash: string,
    readonly dir: string,
    private readonly data: ReferenceData,
  ) {}

  static load(config: { data: string }, hash: string): Reference | null {
    const dirAbs = join(config.data, 'references', hash);
    const metaPath = join(dirAbs, 'meta.yml');
    if (!existsSync(metaPath)) return null;
    const data = (parse(readFileSync(metaPath, 'utf8')) ?? {}) as ReferenceData;
    return new Reference(hash, `references/${hash}`, data);
  }

  toJSON(): ReferenceJSON {
    return {
      source: this.data.source ?? {},
      dir: this.dir,
      elements: (this.data.elements ?? []).map((e) => ({
        id: e.id ?? '',
        selector: e.selector ?? '',
        breakpoints: e.breakpoints ?? [],
        states: e.states ?? [{ name: 'rest', steps: [] }],
      })),
    };
  }
}
```

- [ ] **Step 4: Run it — verify it passes**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/__tests__/reference-entity.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Update `StoryMeta` — failing test first.** In `src/__tests__/story-entity.test.ts`, replace the `toJSON` region/breakpoint assertions with the new binding shape. Add:

```typescript
it('toJSON returns the reference binding + story elements', () => {
  // build a workspace with stories/<id>/meta.yml: { reference: <hash>, elements: [{id: full, selector: ""}] }
  // (mirror the existing test's workspace builder)
  const json = story.toJSON();
  expect(json.reference).toBe(hash);            // the hash string
  expect(json.referenceDir).toBe(`references/${hash}`);
  expect(json.elements).toEqual([{ id: 'full', selector: '' }]);
});
```

(Replace the prior `breakpoints`/`regions` assertions in the same file — they assert the removed shape.)

- [ ] **Step 6: Run it — verify it fails**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/__tests__/story-entity.test.ts`
Expected: FAIL — `toJSON` still returns `breakpoints`, no `elements`.

- [ ] **Step 7: Rewrite `StoryMeta` constructor + `toJSON()`** in `story-entity.ts`. The on-disk `StoryMetaData` is now `{ reference?: string; elements?: Array<{id; selector?; states?}> }`. Constructor reads `meta.reference` (the hash). `toJSON()`:

```typescript
toJSON(): StoryMetaJSON {
  const reference = this._meta.reference ?? null;            // hash string
  const referenceDir = reference ? `references/${reference}` : null;
  const elements = (this._meta.elements ?? []).map((e) => ({
    id: e.id,
    selector: e.selector ?? '',
  }));
  return {
    storyId: this.storyId,
    section: this.section,
    storyDir: this.storyDir,
    reference,
    referenceDir,
    elements,
  };
}
```

Update the `StoryMetaJSON`, `StoryMetaData` types accordingly (drop `breakpoints`/`regions`/`reference.source`; `reference` is now a hash string). Remove the now-unused `hashReferenceUrl` call inside `toJSON` (referenceDir derives from the stored hash directly). Delete the old `StoryMetaReference`/`StoryMetaBreakpointJSON`/`StoryMetaRegionJSON` types.

- [ ] **Step 8: Run tests — verify pass**

Run: `cd packages/storybook-addon-designbook && npx vitest run src/__tests__/story-entity.test.ts src/__tests__/reference-entity.test.ts`
Expected: PASS.

- [ ] **Step 9: `pnpm check`** (full typecheck catches any other consumer of the removed types) — Run: `pnpm check`. Expected: PASS, OR a compile error pointing at `vite-plugin.ts` / `VisualCompareTool.tsx` (handled in Task 3). If only those two files error, proceed to commit the model + fix consumers in Task 3; if anything else errors, fix it here.

- [ ] **Step 10: Commit**

```bash
git add packages/storybook-addon-designbook/src/reference-entity.ts packages/storybook-addon-designbook/src/story-entity.ts packages/storybook-addon-designbook/src/__tests__/reference-entity.test.ts packages/storybook-addon-designbook/src/__tests__/story-entity.test.ts
git commit -m "feat(addon): Reference model + StoryMeta reference-binding toJSON"
```

---

### Task 3: Addon — read path (vite-plugin endpoint + VisualCompareTool + withVisualCompare)

**Files:**
- Modify: `packages/storybook-addon-designbook/src/vite-plugin.ts` (`/__designbook/story` handler 503–541)
- Modify: `packages/storybook-addon-designbook/src/components/VisualCompareTool.tsx` (`StoryJSON`/`BreakpointJSON` ifaces 49–52, `discoverBreakpoints` 54–84, AND the render block 171–191 that maps `bp.regions`)
- Modify: `packages/storybook-addon-designbook/src/withVisualCompare.ts` (lines 19 `reference_selector?`, 48 `story.breakpoints?.[breakpoint]?.regions`)

**Interfaces:**
- Consumes: Task 2 `StoryMeta.toJSON()` (`{reference, referenceDir, elements[]}`), `Reference.load/.toJSON()`.
- Produces: `/__designbook/story/<id>` JSON = `{ ...storyJSON, referenceElements: ReferenceElement[] }` — story selectors + the reference's element/state/breakpoint matrix for the overlay.

- [ ] **Step 0: Load gate** — load `designbook-addon-skills` before editing any addon TS (this task + Task 2).

- [ ] **Step 1: Update the endpoint** — after `StoryMeta.load`, resolve the Reference and merge its elements:

```typescript
const story = StoryMeta.load(config, storyId);
if (!story) { /* 404 as before */ }
const storyJson = story.toJSON();
const ref = storyJson.reference ? Reference.load(config, storyJson.reference) : null;
const payload = { ...storyJson, referenceElements: ref ? ref.toJSON().elements : [] };
res.setHeader('Content-Type', 'application/json');
res.statusCode = 200;
res.end(JSON.stringify(payload));
```

Add `import { Reference } from './reference-entity';` at the top of `vite-plugin.ts`.

- [ ] **Step 2: Update `VisualCompareTool.tsx`** — replace the `StoryJSON`/`BreakpointJSON` interfaces and `discoverBreakpoints` to read `referenceElements` (element → its breakpoints/states) and the story `elements` (story selector per element id):

```typescript
interface StoryJSON {
  referenceDir?: string | null;
  reference?: string | null;
  elements?: Array<{ id: string; selector: string }>;
  referenceElements?: Array<{ id: string; selector: string; breakpoints: string[]; states: Array<{ name: string }> }>;
}
```

Rebuild the dropdown rows from `referenceElements`: for each reference element, for each of its `breakpoints`, list `{ name: element.id, breakpoint, states: element.states.map(s => s.name), storySelector: storyElements[id]?.selector ?? '' }`. Keep the existing `KNOWN_BREAKPOINTS[name]` width lookup and sort. Status badges stay `null` (runtime-only), as today. **Also update the render block (lines ~171–191)** that maps `bp.regions` — rename to the element list (`bp.elements` or the rebuilt `RegionInfo[]` renamed to `ElementInfo[]`), so the component compiles and renders element rows. Remove the `reference_selector` field from the local interfaces (line 41) — the story side carries only `selector`.

- [ ] **Step 3: Rework `withVisualCompare.ts`** — line 19 drops `reference_selector?`; line 48 `const regions = story.breakpoints?.[breakpoint]?.regions;` becomes a read of the resolved `elements`/`referenceElements` shape (match whatever `VisualCompareTool` consumes). The decorator must pull the per-element story `selector` for overlay positioning. Keep its behavior; only the data shape changes.

- [ ] **Step 4: `pnpm check`** — Run: `pnpm check`. Expected: PASS (typecheck clean, all 985+ tests green). A failing test that asserts the old `breakpoints.regions` shape is fixed here (update it to the element shape).

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/vite-plugin.ts packages/storybook-addon-designbook/src/components/VisualCompareTool.tsx packages/storybook-addon-designbook/src/withVisualCompare.ts
git commit -m "feat(addon): story endpoint + VisualCompareTool + withVisualCompare resolve reference elements"
```

---

### Task 4: Skill — `ensure-baseline` task (idempotent reference capture)

**Files:**
- Create: `.agents/skills/designbook/design/tasks/ensure-baseline.md` (rebuilt from `tasks/capture-reference.md`)
- Delete: `.agents/skills/designbook/design/tasks/capture-reference.md`
- Modify: `.agents/skills/designbook/design/rules/playwright-capture.md` (filename convention + output dir wording)

**Interfaces:**
- Consumes: Task 1 `Reference`/`Screenshot`/`Element`; the isolate-and-capture protocol (PR #112).
- Produces: for each requested `Screenshot{element,state,breakpoint,selector}` a frozen PNG at `references/<hash>/<breakpoint>--<element>--<state>.png`. Idempotent: skip if the file exists unless `--refresh-reference`.

- [ ] **Step 1: Load gate** — `designbook-skill-creator` + `rules/task-files.md` + `rules/common-rules.md`. Read `capture-reference.md` + `playwright-capture.md`.

- [ ] **Step 2: Write `ensure-baseline.md`** — frontmatter triggers on the reference-capture steps used by both families (`extract-reference` and the verify `capture`/`re-capture` ensuring step), iterates the reference-side `Screenshot` list, result path `references/<hash>/<bp>--<element>--<state>.png`. Body: for each screenshot, if the PNG exists and no `--refresh-reference`, reuse (skip); else run isolate-and-capture (per `playwright-capture`) of `screenshot.selector` at `screenshot.breakpoint`, running the element's `state.steps` before isolating, then full-page transparent capture to the result path. No-match → full-page fallback + warning, never fail.

```markdown
---
name: designbook:design:ensure-baseline
title: "Ensure Baseline: {{ screenshot.element }} ({{ screenshot.breakpoint }}/{{ screenshot.state }})"
trigger:
  steps: [extract-reference, ensure-baseline]
priority: 10
params:
  type: object
  required: [screenshot, reference_dir]
  properties:
    screenshot: { type: object, $ref: ../schemas.yml#/Screenshot }
    reference_dir: { type: string }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [screenshot_file]
  properties:
    screenshot_file:
      path: "{{ reference_dir }}/{{ screenshot.breakpoint }}--{{ screenshot.element }}--{{ screenshot.state }}.png"
      submission: direct
      validators: [image]
each:
  screenshot:
    expr: "reference_screenshots"
    schema: { $ref: ../schemas.yml#/Screenshot }
---

# Ensure Baseline

Capture-once, frozen reference baseline. For this `screenshot`:

1. **Reuse if present.** If the result PNG already exists and no `--refresh-reference` flag is set, register the existing file as the result and stop — the baseline is stable and never re-captured.
2. **Otherwise capture** via the `playwright-capture` rule's isolate-and-capture mode:
   resolve the viewport width for `screenshot.breakpoint` from `design-tokens.yml`; run the
   element state's `steps` against the reference page (in full layout) when the state is non-rest;
   then isolate `screenshot.selector` (empty ⇒ full page) and capture full-page transparent to the
   staged result path. A selector that matches nothing → full-page fallback + warning, never fail.
3. **Verify** by reading the captured image.
```

- [ ] **Step 3: Delete `capture-reference.md`** — `git rm .agents/skills/designbook/design/tasks/capture-reference.md`.

- [ ] **Step 4: Update `playwright-capture.md`** — change the filename convention note from `{breakpoint}--{region}{file_suffix}.png` to `<breakpoint>--<element>--<state>.png` (rest included literally); clarify the reference baseline writes to `references/<hash>/` and the story capture writes to `stories/<id>/screenshots/`.

- [ ] **Step 5: `pnpm check`** — Run: `pnpm check`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook/design/tasks/ensure-baseline.md .agents/skills/designbook/design/tasks/capture-reference.md .agents/skills/designbook/design/rules/playwright-capture.md
git commit -m "feat(ensure-baseline): idempotent frozen reference baseline capture"
```

---

### Task 5: Skill — `extract-reference` writes the Reference + baseline

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/extract-reference.md` (frontmatter `result` 19–32 + body)

**Interfaces:**
- Consumes: Task 1 `Reference`/`Element`; Task 4 `ensure-baseline`.
- Produces: `references/<hash>/meta.yml` (a `Reference`) + the baseline PNGs for the asked `elements × breakpoints × states`. Emits `reference_screenshots` (the `Screenshot` list) consumed by `ensure-baseline`.

- [ ] **Step 1: Load gate** — `designbook-skill-creator` + `rules/task-files.md` + `rules/common-rules.md`. Read `extract-reference.md`.

- [ ] **Step 2: Rewrite frontmatter `result`** to return the `Reference` meta + the screenshot list:

```yaml
result:
  type: object
  required: [reference_dir]   # `reference` is conditional — the no-reference path (empty url) returns reference_dir: "" and does NOT submit reference, so it must NOT be required
  properties:
    reference_dir: { type: string }
    reference:
      type: object
      path: "{{ reference_dir }}/meta.yml"
      $ref: ../schemas.yml#/Reference
    reference_screenshots:
      type: array
      items: { $ref: ../schemas.yml#/Screenshot }
```

Add `elements` (array of `Element`) and `breakpoints` to `params` (caller-supplied or asked). Keep `extract.json` extraction (the `DesignReference` is now written to `{{ reference_dir }}/extract.json` and referenced by `Reference.extract`).

- [ ] **Step 3: Rewrite body** — keep the full DesignReference extraction + asset/font download. Add:
  - **Ask** (when not provided): which breakpoints, which elements (id + reference selector). Persist into the `Reference`.
  - Write `references/<hash>/meta.yml` (the `Reference`: source, elements[{id, selector, states (from extract.json behaviors), breakpoints}], extract, assets_dir).
  - Materialize `reference_screenshots` = for each element × state × breakpoint a `Screenshot{element, state, breakpoint, selector: element.selector}`. The `ensure-baseline` each-expansion then captures any missing ones (capture-once).
  - When `reference_url` is empty (no reference): write nothing, `reference_dir: ""`, empty list (reference-free downstream).
  - `--refresh-reference` deletes existing baseline PNGs so they re-capture.

- [ ] **Step 4: `pnpm check`** — Run: `pnpm check`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/tasks/extract-reference.md
git commit -m "feat(extract-reference): author Reference meta.yml + emit baseline screenshots"
```

---

### Task 6: Skill — `setup-compare` writes the story binding + story screenshots

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/setup-compare.md` (frontmatter 1–37 + body)

**Interfaces:**
- Consumes: Task 1 `StoryMeta`/`Screenshot`; the Reference at `references/<hash>/`.
- Produces: `stories/<id>/meta.yml` (`{reference: <hash>, elements:[{id, selector}]}`) + `story_screenshots` (the `Screenshot` list, story-side) consumed by `capture-storybook`; ensures any missing reference baselines (via `ensure-baseline`).

- [ ] **Step 1: Load gate** — `designbook-skill-creator` + `rules/task-files.md` + `rules/common-rules.md`. Read `setup-compare.md`.

- [ ] **Step 2: Rewrite frontmatter `result`**:

```yaml
result:
  type: object
  required: [story-meta, story_screenshots, reference_screenshots]
  properties:
    story-meta:
      path: designbook/stories/{{ story_id }}/meta.yml
      type: object
      $ref: ../schemas.yml#/StoryMeta
    story_screenshots: { type: array, items: { $ref: ../schemas.yml#/Screenshot } }
    reference_screenshots: { type: array, items: { $ref: ../schemas.yml#/Screenshot } }
```

`params`: `story_id`, `reference` (hash), `elements` (asked/given: id + story selector + which breakpoints), `design_tokens`. Drop `region`/`reference`-array/`Check`.

- [ ] **Step 3: Rewrite body** — ask (or take) breakpoints + elements (id + story selector). Write the binding `stories/<id>/meta.yml` = `{reference: <hash>, elements:[{id, selector}]}`. Emit `story_screenshots` = element × state × breakpoint `Screenshot{selector: story selector}`, and `reference_screenshots` = the same matrix with the reference selector (resolved from the Reference) so `ensure-baseline` can fill any gap. No `file_suffix`; the path derives state directly.

- [ ] **Step 4: `pnpm check`** — Run: `pnpm check`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/tasks/setup-compare.md
git commit -m "feat(setup-compare): story binding + story/reference screenshot lists"
```

---

### Task 7: Skill — `capture-storybook` story-only + new filename

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/capture-storybook.md` (frontmatter `result` 26–30 + body, and `each` driver)

**Interfaces:**
- Consumes: Task 6 `story_screenshots`.
- Produces: `stories/<id>/screenshots/<bp>--<element>--<state>.png` per story `Screenshot`.

- [ ] **Step 1: Load gate** — `designbook-skill-creator` + `rules/task-files.md` + `rules/common-rules.md`. Read `capture-storybook.md`.

- [ ] **Step 2: Rewrite frontmatter** — `each` over `story_screenshots` (schema `Screenshot`); `params` `screenshot` + `story_url`; result path:

```yaml
result:
  type: object
  required: [screenshot_file]
  properties:
    screenshot_file:
      path: "designbook/stories/{{ story_id }}/screenshots/{{ screenshot.breakpoint }}--{{ screenshot.element }}--{{ screenshot.state }}.png"
      submission: direct
      validators: [image]
each:
  screenshot:
    expr: "story_screenshots"
    schema: { $ref: ../schemas.yml#/Screenshot }
```

- [ ] **Step 3: Rewrite body** — capture the STORY via isolate-and-capture of `screenshot.selector` (empty ⇒ `#storybook-root`), at `screenshot.breakpoint`, running the state steps first when non-rest. No reference capture here.

- [ ] **Step 4: `pnpm check`** — Run: `pnpm check`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/tasks/capture-storybook.md
git commit -m "feat(capture-storybook): story-only isolate capture, element--state filename"
```

---

### Task 8: Skill — `compare-screenshots` pairs by (element,state,breakpoint)

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/compare-screenshots.md` (frontmatter 1–42 + body)

**Interfaces:**
- Consumes: story PNGs (`stories/<id>/screenshots/`) + frozen baseline PNGs (`references/<hash>/`), paired by `(element,state,breakpoint)`.
- Produces: `issues` + `compare_artifacts` (unchanged result schema).

- [ ] **Step 1: Load gate** — `designbook-skill-creator` + `rules/task-files.md` + `rules/common-rules.md`. Read `compare-screenshots.md`.

- [ ] **Step 2: Rewrite frontmatter** — `each` over `story_screenshots`; `params` `screenshot` + `reference_dir` + `story_id`. For each `screenshot`, the story file is `stories/<id>/screenshots/<bp>--<element>--<state>.png` and the baseline is `<reference_dir>/<bp>--<element>--<state>.png`. Keep the `issues`/`compare_artifacts` result schema.

- [ ] **Step 3: Rewrite body** — compare the two PNGs (existing `screen-compare` rule / odiff) by the derived filenames; emit issues per screenshot.

- [ ] **Step 4: `pnpm check`** — Run: `pnpm check`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/tasks/compare-screenshots.md
git commit -m "feat(compare-screenshots): pair story vs frozen baseline by element/state/breakpoint"
```

---

### Task 9: Skill — design-verify workflow: capture = story-only; reference ensures baseline

**Files:**
- Modify: `design/workflows/design-verify.md` (stages 14–34)
- Modify: `tasks/intake--design-verify.md` — emits `regions: Region{id,selector,reference_selector}` → emit `elements: Element{id, selector}` (story-side id + selector) for `setup-compare`; the reference-side selectors live on the `Reference` (from extract-reference). Update the body's "Region = named selector PAIR" guidance to single-`selector` `Element`s; the shell/entity/screen examples become `[{id: header, selector: ".page__header"}, …]` / `[{id: full, selector: ""}]`.
- Modify: `tasks/verify.md` — polish-time single-check verify keyed by `region`/`#/RegionId` → `element`/`#/ElementId`; paths `{bp}--{region}.png` → `{bp}--{element}--{state}.png` (reference `references/<hash>/…`, story `stories/<id>/screenshots/…`); the threshold lookup `story_meta.reference.breakpoints.<bp>.regions.<region>` no longer exists (StoryMeta is the thin binding) — drop the per-region threshold lookup or read a flat threshold.
- Modify: `tasks/outtake--design-workflow.md` — `regions: #/RegionId` → `elements: #/ElementId`; the "breakpoints[] × regions[] × …" matrix language → "× elements[] ×".
- Verify (no change expected): `design-entity.md`, `design-screen.md`, `design-shell.md` reference stages already run `extract-reference` (now baseline-authoring via Task 5).

**Interfaces:**
- Consumes: Tasks 4–8.

- [ ] **Step 1: Load gate** — `designbook-skill-creator` + `rules/workflow-files.md` + `rules/task-files.md` + `rules/common-rules.md`. Read `design-verify.md`, `intake--design-verify.md`, `verify.md`, `outtake--design-workflow.md`.

- [ ] **Step 2: Update verify stages** — `reference` stage ensures the baseline (runs `extract-reference`/`ensure-baseline` so any asked element×bp×state has a frozen PNG). `capture` and `re-capture` stages run ONLY `capture-storybook` (drop `capture-reference` — it no longer exists). `setup-compare`, `compare`/`re-compare` stay but now drive the new `story_screenshots` list. Confirm no stage still references `capture-reference` or `Check`/`region`/`file_suffix`.

- [ ] **Step 2b: Update the remaining verify task files** — apply the transforms listed in **Files** to `intake--design-verify.md` (emit `elements`, single selector), `verify.md` (region→element, new filenames, drop per-region threshold lookup), `outtake--design-workflow.md` (regions→elements). No `#/Region`/`#/RegionId`/`#/Check`/`reference_selector`/`file_suffix` may remain in any of them.

- [ ] **Step 3: Grep guard (skills + addon)** — Run:
  `grep -rn "capture-reference\|file_suffix\|reference_selector\|#/Check\|#/Region\b\|RegionId" .agents/skills/designbook/design`
  and
  `grep -rnE "reference_selector|story\.breakpoints|\.breakpoints\?\.\[|StoryMetaRegionJSON|StoryMetaBreakpointJSON" packages/storybook-addon-designbook/src --include='*.ts' --include='*.tsx' | grep -v __tests__`.
  Expected: no matches in the skills grep; the addon grep targets the OLD StoryMeta-JSON shape (`story.breakpoints[...].regions`, the removed JSON types, `reference_selector`) — internal render-layer field names like `BreakpointInfo.regions` are cosmetic and acceptable, so do NOT grep bare `.regions`. The only surviving `Region*` token in skills is `RegionProperties` (grounding layer, out of scope). Fix any straggler in its owning task.

- [ ] **Step 4: `pnpm check`** — Run: `pnpm check`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add design/workflows/design-verify.md .agents/skills/designbook/design/tasks/intake--design-verify.md .agents/skills/designbook/design/tasks/verify.md .agents/skills/designbook/design/tasks/outtake--design-workflow.md
git commit -m "feat(design-verify): story-only capture; sweep intake/verify/outtake to element model"
```

---

### Task 10: From-scratch integration verification

**Files:** none (end-to-end behavior).

**Interfaces:** Consumes Tasks 1–9.

- [ ] **Step 1: Rebuild workspace** — `./scripts/setup-workspace.sh drupal-web` then `./scripts/setup-test.sh drupal-web design-entity --into workspaces/drupal-web` (from worktree root). Start Storybook (`_debo storybook start`).

- [ ] **Step 2: Run design-entity** (signage, leando.de, element `full`/`app-signage`, bp xl) from scratch. Expected: `references/<hash>/meta.yml` (a `Reference` with `elements:[{id: full, selector: app-signage, breakpoints:[xl], states:[rest]}]`) + `references/<hash>/xl--full--rest.png` baseline + `extract.json`. No `stories/.../screenshots`, no `Check`.

- [ ] **Step 3: Run design-verify** (signage, element `full`, bp xl + lg). Expected: `xl--full--rest.png` baseline REUSED (unchanged mtime), `lg--full--rest.png` baseline captured once, `stories/entities-paragraph-signage--full/meta.yml` = `{reference: <hash>, elements:[{id: full, selector: ""}]}`, story PNGs `stories/.../screenshots/{xl,lg}--full--rest.png`, compare issues produced.

- [ ] **Step 4: Addon dropdown** — open `http://localhost:<port>/?path=/story/entities-paragraph-signage--full`; the visual-compare dropdown lists element `full` at xl + lg with the reference overlay (baseline) and the story screenshots. Confirm populated.

- [ ] **Step 5: Stability check** — re-run design-verify. Expected: baseline PNGs unchanged (same mtime); only story PNGs re-captured. Then run with `--refresh-reference`. Expected: baseline PNGs re-captured (new mtime).

- [ ] **Step 6: Document result** — note in the verification output: Reference authored ✔ / baseline frozen+reused ✔ / story-only verify capture ✔ / dropdown populated ✔ / refresh re-captures ✔. No separate commit (no file change); if a wording/path bug surfaces, return to its owning task.

---

## Self-Review

**Spec coverage:**
- Reference first-class object (Issue #4) → Task 1 (`Reference` schema) + Task 2 (`reference-entity.ts`). ✔
- Stable baseline, capture-once, frozen → Task 4 (`ensure-baseline` idempotent) + Task 10 Step 5. ✔
- extract-reference authors meta.yml + baseline → Task 5. ✔
- Unified `Screenshot {element,state,breakpoint,selector}` → Task 1; consumed Tasks 4–8. ✔
- `element` rename, no `reference_selector`/`file_suffix`/`Check`/`Region` → Task 1 + Task 9 grep guard. ✔
- Story binding references reference → Task 1 (`StoryMeta`) + Task 2 (`toJSON`). ✔
- design-verify story-only capture + compare vs baseline → Tasks 6,7,8,9. ✔
- Addon read path resolves reference → Task 3 (vite-plugin endpoint, full VisualCompareTool incl. render block, withVisualCompare decorator). ✔
- Addon-skills gate for TS edits → Global Constraints + Task 2 Step 0 + Task 3 Step 0. ✔
- Verify score/outtake schemas rename region→element (RegionId→ElementId) → Task 1 Step 4. ✔
- RegionProperties / region-properties resolver / inspect region.ts left intact (grounding layer, no RegionId dep) → File Structure out-of-scope note. ✔
- Refresh policy → Task 4 / Task 5 (`--refresh-reference`) + Task 10 Step 5. ✔
- Builds on PR #112 isolate-and-capture → Tasks 4,7 bodies. ✔

**Placeholder scan:** TS tasks carry real test + impl code; skill tasks carry exact frontmatter; the skill-doc bodies describe exact content to write (no TBD). The grep guard (Task 9 Step 3) catches any missed removal. ✔

**Type consistency:** `Screenshot{element,state,breakpoint,selector}`, `Element{id,selector,states,breakpoints}`, `Reference{source,elements,extract,assets_dir}`, `StoryMeta{reference,elements[{id,selector}]}` used identically across Tasks 1–9. `reference` = hash string everywhere; `referenceDir` = `references/<hash>`. Filename `<bp>--<element>--<state>.png` identical in Tasks 4,6,7,8,10. ✔
