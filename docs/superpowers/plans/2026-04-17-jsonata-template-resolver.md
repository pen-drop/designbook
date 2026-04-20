# JSONata Template Resolver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled `expandParams` / `expandFilePath` regex expander with a single JSONata-based interpolator, and rewrite the `each:` frontmatter convention to use explicit `binding: expr` pairs instead of singularization magic.

**Motivation:** The current expander uses `\w+` inside `{{ … }}`, so dotted paths like `{{ variant.id }}` never match and silently pass through — causing files to be written at literal `navigation.{{ variant.id }}.story.yml` paths. Adding dot support would only fix one case; every future need (filters, defaults, array joins, case conversion) would grow the regex. JSONata already solves all of these, is already a project dependency (`designbook-css-*/*.jsonata`), and consolidates `{{ … }}`, `${VAR}` env refs, and `each:` expressions under one evaluator.

**Breaking:** All templates (`{{ … }}`) and all `each:` frontmatter blocks in `.agents/skills/` change shape. Per CLAUDE.md ("no migration/compat code, existing on-disk artifacts are disposable"), we rewrite the task files in-place rather than supporting both forms.

**Tech Stack:** TypeScript, vitest, Node.js (addon), YAML (skill artifacts), pnpm workspaces, JSONata, `_debo`/`npx storybook-addon-designbook` CLI.

---

## Design

### Unified interpolator

One function replaces `expandParams` + `expandFilePath`:

```ts
async function interpolate(
  template: string,
  scope: Record<string, unknown>,
  options?: { lenient?: boolean; envMap?: Record<string, string> },
): Promise<string>
```

- Splits the template on `{{ … }}` segments.
- Evaluates each segment as a JSONata expression against `scope`.
- Stringifies the result (preserving the existing array-of-objects special cases for `scene` / `storyId`).
- Pre-pass rewrites `${VAR}` / `$VAR` → `{{ $env.VAR }}` so env-var syntax flows through the same evaluator; `envMap` is attached to scope as `$env`.
- Compiled expressions are cached in a `Map<string, jsonata.Expression>` to avoid re-parsing on each call.
- `lenient: true` leaves unknown paths as the original `{{ … }}` literal instead of throwing (same semantic as today's param-expansion during `each:` pre-rendering).

### New `each:` syntax — always explicit binding

One syntax, no dual modes, no field-spread shortcut. Every `each:` names one or more bindings. Every template addresses iteration state through the binding: `{{ check.story_id }}`, never `{{ story_id }}`.

Long form:

```yaml
each:
  <binding>:
    expr: "<jsonata-expression>"
    schema: { $ref: "…/SomeType" }   # optional
```

Short form (no schema):

```yaml
each:
  <binding>: "<jsonata-expression>"
```

Examples:

```yaml
# Single axis — replaces today's flat "each: checks"
each:
  check: "checks"

# Nested lookup — replaces today's "each: component.variants" + singularize
each:
  variant:
    expr: "component.variants"
    schema: { $ref: "designbook/design/schemas.yml#/Variant" }

# Cross-product
each:
  variant:    "component.variants"
  breakpoint: "$env.BREAKPOINTS"

# Filter
each:
  variant: "component.variants[published = true]"
```

**Per iteration** the resolver produces `{ <binding>: <element>, … }` and merges that into the task scope. No field spreading, no top-level expansion of element fields.

### Consequence for task params

Tasks that today rely on field-spread (`each: { section: { $ref } }` spreading `section_id`, `section_title`, … into top-level params) are restructured to accept the element as one object param. Example `create-section`:

```yaml
# Today
params:
  required: [section_id, section_title, description, order, vision]
  properties:
    section_id:    { type: string }
    section_title: { type: string }
    description:   { type: string }
    order:         { type: integer }
    vision: { … }

# After migration
params:
  required: [section, vision]
  properties:
    section:
      type: object
      $ref: ../schemas.yml#/Section
    vision: { … }
```

All template references inside that task shift: `{{ section_id }}` → `{{ section.section_id }}`, etc. Upstream workflow stages must emit the element as one object (`section: { section_id: …, section_title: …, … }`) rather than flat fields. If an intake step today emits the fields individually, a small transform in that step wraps them.

### Function / helper list (scope attached under `$*` keys)

- `$env` — env map (replaces `${VAR}` / `$VAR`)
- `$i` — zero-based iteration index (set inside `each`-expanded tasks only)
- `$total` — total iteration count (set inside `each`-expanded tasks only)
- JSONata built-ins remain available: `$lowercase`, `$uppercase`, `$join`, `$count`, `$filter`, `$map`, etc.

---

## File Structure

**New files:**
- `packages/storybook-addon-designbook/src/template/interpolate.ts` — JSONata-backed interpolator
- `packages/storybook-addon-designbook/src/template/__tests__/interpolate.test.ts` — unit tests
- `packages/storybook-addon-designbook/src/template/each.ts` — new `each:` resolver (replaces `singularize` + `resolveEachIterables`)
- `packages/storybook-addon-designbook/src/template/__tests__/each.test.ts` — unit tests

**Modified (code):**
- `packages/storybook-addon-designbook/src/workflow-resolve.ts` — delete `expandParams`, `expandFilePath`; re-export from `template/interpolate.ts`; async-propagate call sites
- `packages/storybook-addon-designbook/src/workflow.ts` — delete `singularize`, `resolveEachIterables`; new `each:` schema parsing; new binding semantics
- `packages/storybook-addon-designbook/src/cli/workflow.ts` — await on new async interpolator at every boundary
- `packages/storybook-addon-designbook/src/schema-block.ts` — if it validates `each:` frontmatter shape, update schema
- `packages/storybook-addon-designbook/src/engines/types.ts` — adjust `StageDefinition.each` / task-level `each` types
- `packages/storybook-addon-designbook/package.json` — ensure `jsonata` is a direct dependency of the addon (it may only be transitive today)

**Modified (tests):**
- `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts` — update to async + dotted-path cases
- `packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts`
- `packages/storybook-addon-designbook/src/validators/__tests__/workflow-write-file.test.ts`

**Modified (skill artifacts — all `each:` blocks):**
- `.agents/skills/designbook/design/tasks/capture-storybook.md`
- `.agents/skills/designbook/design/tasks/capture-reference.md`
- `.agents/skills/designbook/design/tasks/compare-screenshots.md`
- `.agents/skills/designbook/design/tasks/polish.md`
- `.agents/skills/designbook/design/tasks/map-entity--design-screen.md`
- `.agents/skills/designbook/sections/tasks/create-section.md`
- `.agents/skills/designbook/css-generate/tasks/generate-jsonata.md`
- `.agents/skills/designbook/import/tasks/run-workflow.md`
- `.agents/skills/designbook-drupal/components/tasks/create-component.md`
- `.agents/skills/designbook-drupal/components/tasks/create-variant-story.md`

**Modified (docs):**
- `.agents/skills/designbook/resources/task-format.md`
- `.agents/skills/designbook/resources/architecture.md`
- `.agents/skills/designbook-skill-creator/resources/schemas.md`

---

## Phase 1 — Baseline & Survey

### Task 1: Verify baseline and enumerate call sites

**Files:** (read-only)

- [ ] **Step 1: Run baseline**

```bash
cd /home/cw/projects/designbook
pnpm check
```

Expected: green. Stop if anything fails — the plan assumes a clean baseline.

- [ ] **Step 2: Enumerate `expandParams` / `expandFilePath` callers**

```bash
grep -rn "expandParams\|expandFilePath" packages/storybook-addon-designbook/src --include="*.ts" | tee /tmp/interpolate-sites.txt
```

Expected: 8 files (listed in *File Structure* above). Note sync vs async contexts — every caller becomes async.

- [ ] **Step 3: Enumerate `each:` blocks in skill artifacts**

```bash
grep -rn "^each:" .agents/skills --include="*.md" | tee /tmp/each-sites.txt
```

Expected: 10 task files + 3 docs (listed above).

- [ ] **Step 4: Enumerate template placeholders in task bodies**

```bash
grep -rn "{{[^}]*}}" .agents/skills --include="*.md" | tee /tmp/template-sites.txt
```

Note which templates reference iteration-spread fields (e.g. `{{ story_id }}` inside `each: checks`) — those must be rewritten to `{{ check.story_id }}` in Phase 4.

No commit yet.

---

## Phase 2 — JSONata Interpolator

### Task 2: Ensure `jsonata` is a direct dependency

**Files:**
- Modify: `packages/storybook-addon-designbook/package.json`

- [ ] **Step 1: Check current state**

```bash
jq '.dependencies.jsonata // "missing"' packages/storybook-addon-designbook/package.json
```

- [ ] **Step 2: Add if missing**

If `"missing"`:

```bash
pnpm --filter storybook-addon-designbook add jsonata
```

Expected: `package.json` + lockfile updated. Commit together with Task 3.

### Task 3: Write failing tests for `interpolate`

**Files:**
- Create: `packages/storybook-addon-designbook/src/template/__tests__/interpolate.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import { interpolate } from '../interpolate.js';

const envMap = { DESIGNBOOK_HOME: '/abs/home', DESIGNBOOK_DATA: '/abs/data' };

describe('interpolate', () => {
  it('expands flat {{ name }}', async () => {
    expect(await interpolate('hi {{ name }}', { name: 'ada' })).toBe('hi ada');
  });

  it('expands dotted {{ variant.id }}', async () => {
    const tpl = 'components/{{ component }}/{{ component }}.{{ variant.id }}.story.yml';
    const scope = { component: 'navigation', variant: { id: 'main' } };
    expect(await interpolate(tpl, scope)).toBe('components/navigation/navigation.main.story.yml');
  });

  it('expands ${VAR} env via $env', async () => {
    const tpl = '${DESIGNBOOK_HOME}/components/{{ component }}/file.yml';
    expect(await interpolate(tpl, { component: 'navigation' }, { envMap }))
      .toBe('/abs/home/components/navigation/file.yml');
  });

  it('supports JSONata filters', async () => {
    const scope = { variants: [{ id: 'main', published: true }, { id: 'draft', published: false }] };
    expect(await interpolate("{{ variants[published=true].id }}", scope)).toBe('main');
  });

  it('supports JSONata functions (lowercase, join)', async () => {
    expect(await interpolate('{{ $lowercase(name) }}', { name: 'Navigation' })).toBe('navigation');
    expect(await interpolate('{{ items.title ~> $join(",") }}', { items: [{ title: 'a' }, { title: 'b' }] }))
      .toBe('a,b');
  });

  it('throws on unknown path by default', async () => {
    await expect(interpolate('{{ missing }}', {})).rejects.toThrow(/missing/);
  });

  it('leaves unknown path as-is when lenient', async () => {
    expect(await interpolate('{{ missing }}', {}, { lenient: true })).toBe('{{ missing }}');
  });

  it('caches compiled expressions across calls', async () => {
    for (let i = 0; i < 100; i++) {
      await interpolate('{{ n }}', { n: i });
    }
    // No assertion — regression guard: should complete quickly without re-parsing.
  });

  it('preserves scene/storyId array short-circuits', async () => {
    const arr = [{ scene: 'shell' }, { scene: 'hero' }];
    expect(await interpolate('{{ scenes }}', { scenes: arr })).toBe('shell');
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm --filter storybook-addon-designbook test -- template/__tests__/interpolate.test.ts
```

Expected: FAIL — module does not exist yet.

### Task 4: Implement `interpolate`

**Files:**
- Create: `packages/storybook-addon-designbook/src/template/interpolate.ts`

- [ ] **Step 1: Implement**

```ts
import jsonata from 'jsonata';

const cache = new Map<string, ReturnType<typeof jsonata>>();

function compile(expr: string): ReturnType<typeof jsonata> {
  const hit = cache.get(expr);
  if (hit) return hit;
  const compiled = jsonata(expr);
  cache.set(expr, compiled);
  return compiled;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === 'object') {
      if ('scene' in first) return String((first as { scene: unknown }).scene);
      if ('storyId' in first) return String((first as { storyId: unknown }).storyId);
    }
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

interface InterpolateOptions {
  lenient?: boolean;
  envMap?: Record<string, string>;
}

export async function interpolate(
  template: string,
  scope: Record<string, unknown>,
  options: InterpolateOptions = {},
): Promise<string> {
  const { lenient = false, envMap } = options;

  // Rewrite ${VAR} / $VAR to {{ $env.VAR }} so env goes through JSONata
  const prepared = template
    .replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, '{{ $env.$1 }}')
    .replace(/(?<![\w$])\$([A-Z_][A-Z0-9_]*)/g, '{{ $env.$1 }}');

  const effectiveScope = envMap ? { ...scope, $env: envMap } : scope;

  const parts = prepared.split(/(\{\{[^}]*\}\})/);
  const resolved = await Promise.all(
    parts.map(async (part) => {
      const match = part.match(/^\{\{\s*(.+?)\s*\}\}$/);
      if (!match) return part;
      const expr = match[1]!;
      try {
        const compiled = compile(expr);
        const value = await compiled.evaluate(effectiveScope);
        if (value === undefined) {
          if (lenient) return part;
          throw new Error(`Unknown expression: {{ ${expr} }} in "${template}"`);
        }
        return stringify(value);
      } catch (err) {
        if (lenient) return part;
        if (err instanceof Error && err.message.startsWith('Unknown expression')) throw err;
        throw new Error(`Error evaluating {{ ${expr} }} in "${template}": ${(err as Error).message}`);
      }
    }),
  );
  return resolved.join('');
}
```

- [ ] **Step 2: Run — expect pass**

```bash
pnpm --filter storybook-addon-designbook test -- template/__tests__/interpolate.test.ts
```

Expected: all tests green.

### Task 5: Re-export from `workflow-resolve.ts` and remove the old expander

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts`

- [ ] **Step 1: Replace `expandParams` + `expandFilePath`**

Delete the two functions (lines 1039–1097 in current source). Add at the top-level:

```ts
import { interpolate } from './template/interpolate.js';

export async function expandParams(
  template: string,
  params: Record<string, unknown>,
  lenient?: boolean,
): Promise<string> {
  return interpolate(template, params, { lenient });
}

export async function expandFilePath(
  template: string,
  params: Record<string, unknown>,
  envMap: Record<string, string>,
  lenient?: boolean,
): Promise<string> {
  return interpolate(template, params, { lenient, envMap });
}
```

Both shims keep the old names for one phase so call-site updates can happen incrementally. Both are now `async` — call sites must `await`. (The shims get deleted in Task 7 after all callers are migrated.)

- [ ] **Step 2: Update `expandFileDeclarations` + `expandResultDeclarations` to be async**

Both currently call `expandFilePath` synchronously. Convert:
- Signatures to `Promise<…>`
- Bodies to `await`
- Replace `declarations.map(…)` with `Promise.all(declarations.map(async (d) => { … }))`

- [ ] **Step 3: Typecheck — expect failures at callers**

```bash
pnpm --filter storybook-addon-designbook typecheck
```

Expected: TS2322 / TS2794 at every sync caller — those are the sites to fix in Task 6.

### Task 6: Propagate async through callers

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow.ts`
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts`
- Modify: any other file in `/tmp/interpolate-sites.txt`

- [ ] **Step 1: For each caller, apply the chain rule**

- Change call to `await expandParams(…)` / `await expandFilePath(…)`.
- Mark the enclosing function `async`, change its return type to `Promise<…>`.
- Repeat one level up until you hit a top-level command handler (CLI commands already run in an async context).

- [ ] **Step 2: Typecheck — expect green**

```bash
pnpm --filter storybook-addon-designbook typecheck
```

- [ ] **Step 3: Run all tests**

```bash
pnpm --filter storybook-addon-designbook test
```

Expected: tests that only exercise the interpolator pass. Tests that exercise `each:` may fail — that's handled in Phase 3. Note failures in `/tmp/phase2-test-failures.txt`.

### Task 6b: Upgrade resolver `from:` to JSONata expression

**Files:**
- Modify: `packages/storybook-addon-designbook/src/resolvers/registry.ts`
- Modify: `packages/storybook-addon-designbook/src/resolvers/__tests__/registry.test.ts` (add dotted-path test)

**Why:** After the object-param migration (Phase 4), resolvers like `scene_path` receive `from: section.section_id` — a dotted lookup against the scope, not a flat key. Today's code does `outputParams[decl.from]`, which fails for dotted `from:`. We lift `from:` to a JSONata expression so it stays coherent with templates and `each:`.

- [ ] **Step 1: Write a failing test**

In `registry.test.ts`, add:

```ts
it('resolves from: with a dotted path expression', async () => {
  const result = await runResolvers(
    {
      scene_path: { type: 'string', resolve: 'scene_path', from: 'section.section_id' },
    },
    { params: { section: { section_id: 'hero-section' } }, config: {…} },
  );
  expect(result.scene_path).toBe('sections/hero-section/hero-section.section.scenes.yml');
});
```

Expected: FAIL — today's code does a flat `outputParams['section.section_id']` lookup.

- [ ] **Step 2: Replace the flat lookup**

In `registry.ts:100`:

```ts
// Before
const fromValue = outputParams[decl.from];

// After
import jsonata from 'jsonata';
const fromValue = await jsonata(decl.from).evaluate(outputParams);
```

The function holding this line becomes `async` if it isn't already — await-propagate per Task 6.

- [ ] **Step 3: Run tests — expect pass**

```bash
pnpm --filter storybook-addon-designbook test -- resolvers/
```

Expected: new dotted-path test passes, all existing flat-`from:` tests continue to pass (a bare identifier is a valid JSONata expression).

- [ ] **Step 4: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/registry.ts \
        packages/storybook-addon-designbook/src/resolvers/__tests__/registry.test.ts
git commit -m "feat(resolver): evaluate from: as JSONata expression for dotted paths"
```

### Task 7: Delete the shim layer

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts`

- [ ] **Step 1: Remove `expandParams` + `expandFilePath` shims**

Delete the two functions added in Task 5. Change all callers to import `interpolate` from `./template/interpolate.js` directly and pass `{ lenient, envMap }` as options. This is a mechanical rewrite of the imports + call shape.

- [ ] **Step 2: Typecheck + test**

```bash
pnpm --filter storybook-addon-designbook typecheck && pnpm --filter storybook-addon-designbook test
```

Expected: green (modulo `each:` failures still open).

### Task 8: Commit Phase 2

- [ ] **Step 1: Commit**

```bash
git add packages/storybook-addon-designbook/src/template/ \
        packages/storybook-addon-designbook/src/workflow-resolve.ts \
        packages/storybook-addon-designbook/src/workflow.ts \
        packages/storybook-addon-designbook/src/cli/workflow.ts \
        packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts \
        packages/storybook-addon-designbook/package.json \
        pnpm-lock.yaml
git commit -m "feat(template): JSONata-based interpolator replaces regex expander"
```

---

## Phase 3 — New `each:` Engine

### Task 9: Write failing tests for new `each:` resolver

**Files:**
- Create: `packages/storybook-addon-designbook/src/template/__tests__/each.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect } from 'vitest';
import { resolveEach } from '../each.js';

describe('resolveEach', () => {
  it('binds single-axis iteration', async () => {
    const each = { check: 'checks' };
    const scope = { checks: [{ story_id: 'a' }, { story_id: 'b' }] };
    expect(await resolveEach(each, scope)).toEqual([
      { check: { story_id: 'a' }, $i: 0, $total: 2 },
      { check: { story_id: 'b' }, $i: 1, $total: 2 },
    ]);
  });

  it('binds nested lookup (replaces singularize)', async () => {
    const each = { variant: 'component.variants' };
    const scope = { component: { variants: [{ id: 'main' }, { id: 'footer' }] } };
    const result = await resolveEach(each, scope);
    expect(result.map((r) => (r.variant as { id: string }).id)).toEqual(['main', 'footer']);
  });

  it('produces cross-product for multiple bindings', async () => {
    const each = { variant: 'variants', bp: 'breakpoints' };
    const scope = { variants: [{ id: 'main' }], breakpoints: ['sm', 'xl'] };
    const result = await resolveEach(each, scope);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ variant: { id: 'main' }, bp: 'sm' });
    expect(result[1]).toMatchObject({ variant: { id: 'main' }, bp: 'xl' });
  });

  it('supports filter expressions', async () => {
    const each = { v: 'variants[published = true]' };
    const scope = { variants: [{ id: 'a', published: true }, { id: 'b', published: false }] };
    const result = await resolveEach(each, scope);
    expect(result).toHaveLength(1);
    expect((result[0]!.v as { id: string }).id).toBe('a');
  });

  it('accepts long form with schema', async () => {
    const each = { check: { expr: 'checks', schema: { $ref: '…/Check' } } };
    const scope = { checks: [{ story_id: 'a' }] };
    const result = await resolveEach(each, scope);
    expect(result[0]!.check).toEqual({ story_id: 'a' });
  });

  it('returns [] when expression yields non-array', async () => {
    expect(await resolveEach({ x: 'missing' }, {})).toEqual([]);
    expect(await resolveEach({ x: 'scalar' }, { scalar: 'hi' })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm --filter storybook-addon-designbook test -- template/__tests__/each.test.ts
```

### Task 10: Implement `resolveEach`

**Files:**
- Create: `packages/storybook-addon-designbook/src/template/each.ts`

- [ ] **Step 1: Implement**

```ts
import jsonata from 'jsonata';

export type EachDeclaration = Record<string, string | { expr: string; schema?: unknown }>;

function getExpr(value: string | { expr: string }): string {
  return typeof value === 'string' ? value : value.expr;
}

export async function resolveEach(
  each: EachDeclaration,
  scope: Record<string, unknown>,
): Promise<Array<Record<string, unknown>>> {
  const axes: Array<{ binding: string; items: unknown[] }> = [];

  for (const [binding, raw] of Object.entries(each)) {
    const expr = getExpr(raw);
    const value = await jsonata(expr).evaluate(scope);
    if (!Array.isArray(value)) {
      return []; // any non-array axis collapses the cross-product
    }
    axes.push({ binding, items: value });
  }

  // Cartesian product
  let combos: Array<Record<string, unknown>> = [{}];
  for (const { binding, items } of axes) {
    const next: Array<Record<string, unknown>> = [];
    for (const combo of combos) {
      for (const item of items) {
        next.push({ ...combo, [binding]: item });
      }
    }
    combos = next;
  }

  const total = combos.length;
  return combos.map((c, i) => ({ ...c, $i: i, $total: total }));
}
```

- [ ] **Step 2: Run — expect pass**

```bash
pnpm --filter storybook-addon-designbook test -- template/__tests__/each.test.ts
```

### Task 11: Wire `resolveEach` into `workflow.ts`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow.ts`

- [ ] **Step 1: Delete the old functions**

Delete `singularize` and `resolveEachIterables` (lines 430–468).

- [ ] **Step 2: Replace call sites**

Find every `resolveEachIterables(eachKey, lookup)` and replace with `await resolveEach(taskFm.each as EachDeclaration, lookup)`. The `eachKey` lookup pattern is no longer needed — the full `each` map is passed through.

Also update frontmatter reading: instead of `Object.keys(taskFm.each)[0]`, pass the full `taskFm.each` object.

- [ ] **Step 3: Update `stepToEach` / `taskFileToEach` mappings**

These currently store a string (the eachKey). Change to `Map<string, EachDeclaration>` storing the full map object.

- [ ] **Step 4: Typecheck + test**

```bash
pnpm --filter storybook-addon-designbook typecheck && pnpm --filter storybook-addon-designbook test
```

Expected: TS errors in validator tests and possibly stage-loader code — fix those or note for Phase 4.

### Task 12: Update `schema-block.ts` if it validates `each:` shape

**Files:**
- Modify: `packages/storybook-addon-designbook/src/schema-block.ts` (conditional)

- [ ] **Step 1: Check for existing validation**

```bash
grep -n "each" packages/storybook-addon-designbook/src/schema-block.ts
```

- [ ] **Step 2: Update schema if present**

The new schema for `each:`:

```yaml
each:
  type: object
  additionalProperties:
    oneOf:
      - type: string                    # short form
      - type: object                    # long form
        required: [expr]
        properties:
          expr: { type: string }
          schema: { type: object }
```

### Task 13: Commit Phase 3

- [ ] **Step 1: Commit**

```bash
git add packages/storybook-addon-designbook/src/template/each.ts \
        packages/storybook-addon-designbook/src/template/__tests__/each.test.ts \
        packages/storybook-addon-designbook/src/workflow.ts \
        packages/storybook-addon-designbook/src/schema-block.ts
git commit -m "feat(workflow): explicit each: binding replaces singularize heuristic"
```

---

## Phase 3b — Upstream Stage Audit

> Every `each:` iterable must be an array of *whole objects* matching its schema. Tasks that today consume spread fields assume their upstream stage emits objects anyway; tasks that today consume spread fields from *flat* item shapes need the producing stage to be upgraded before Phase 4 touches the consumer. This phase finds those cases.

### Task 13b: Audit iterable producers

**Files:** (read-only survey)

- [ ] **Step 1: Map each iterable to its producing stage**

For every binding in Phase 4 (`check`, `section`, `component`, `variant`, `issue`, `mapping`, `group`, `workflow`), find the stage that emits the array.

```bash
for name in checks sections components variants issues entity_mappings groups workflows; do
  echo "=== ${name} ==="
  grep -rn "${name}:" .agents/skills --include="*.md" | grep -v "^.*each:" | head -5
done | tee /tmp/iterable-producers.txt
```

Expected: a stage file per iterable — usually an intake, plan, or setup-compare style task with `result.properties.<name>` declared as an array.

- [ ] **Step 2: Verify item shape is whole-object**

For each producer, read the declared `items.$ref` or inline schema. Mark as **OK** if items are whole-object (e.g. `items: { $ref: ../schemas.yml#/Section }`). Mark as **NEEDS-WRAP** if items are flat-field maps that only make sense post-spread.

Record the result as a checklist in `/tmp/iterable-producers.txt`:

```
checks         → setup-compare.md       OK (items: { $ref: …/Check })
sections       → intake.md (sections)   NEEDS-WRAP — items emit top-level fields
components     → intake.md (components) OK
variants       → intake.md (components) OK (nested under component)
issues         → compare-screenshots.md OK
entity_mappings → map-entity--design-screen.md OK
groups         → intake.md (css)        OK
workflows      → intake.md (import)     OK
```

- [ ] **Step 3: Plan wraps for NEEDS-WRAP cases**

For every NEEDS-WRAP entry, add a sub-task to the relevant Phase-4 task entry (Task 15/18/18b Step "Upstream check"): either upgrade the producer's `result:` schema to emit whole objects, or add a minimal JSONata transform on the producer side (`$map($, function($s) { { "section_id": $s.id, … } })`). Note the producer and the needed transform in `/tmp/iterable-producers.txt` so Phase 4 tasks can reference it.

- [ ] **Step 4: No commit — audit-only**

Carry `/tmp/iterable-producers.txt` forward into Phase 4.

---

## Phase 4 — Migrate Skill Artifacts

> **Load skill-creator first** (per CLAUDE.md rule) before editing any task file in Phase 4:
>
> ```
> Load designbook-skill-creator skill.
> ```

Each task below migrates one task file. The pattern is always:
1. **`each:`** — from `each: { <source>: { $ref: ... } }` → `each: { <binding>: { expr: "<source>", schema: { $ref: ... } } }`. Pick a singular binding name (`check`, `section`, `group`, `workflow`, `variant`, …).
2. **`params:`** — if the task relied on field-spread (its `required:` list contained item fields like `section_id`, `story_id`, `breakpoint`, …), replace those entries with one object-typed param named after the binding, `$ref`ing the element schema.
3. **Templates** — every `{{ <field> }}` / `{<field>}` in the body, result paths, and rules that referenced a spread field becomes `{{ <binding>.<field> }}`.
4. **Upstream stages** — grep for the stage that produces the iterable (`checks`, `sections`, `entity_mappings`, …). Confirm it emits items as whole objects. If it emits flat fields per item, add a minimal transform so each item is the object shape the binding now expects.
5. Re-run the relevant tests.

### Task 14: Migrate `create-variant-story.md`

**Files:**
- Modify: `.agents/skills/designbook-drupal/components/tasks/create-variant-story.md`

- [ ] **Step 1: Rewrite `each:`**

Before:

```yaml
each:
  component.variants:
    $ref: designbook/design/schemas.yml#/Variant
```

After:

```yaml
each:
  variant:
    expr: "component.variants"
    schema: { $ref: designbook/design/schemas.yml#/Variant }
```

- [ ] **Step 2: Confirm templates already use `{{ variant.id }}`**

They do — this task was already dotted-style. Nothing to change in the body.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-drupal/components/tasks/create-variant-story.md
git commit -m "refactor(skill): create-variant-story uses explicit each binding"
```

### Task 15: Migrate `create-component.md`

**Files:**
- Modify: `.agents/skills/designbook-drupal/components/tasks/create-component.md`

- [ ] **Step 1: Rewrite `each:`**

Before:

```yaml
each:
  component:
    $ref: designbook/design/schemas.yml#/Component
```

After:

```yaml
each:
  component:
    expr: "components"
    schema: { $ref: designbook/design/schemas.yml#/Component }
```

Convention: singular binding, plural expression. The workflow scope supplies `components` as the list.

- [ ] **Step 2: Restructure `params:`**

Inspect the current `params.required` / `params.properties`. If it lists fields that today come from the spread component (`component_id`, `variants`, `slots`, …), collapse them into:

```yaml
params:
  required: [component, …]
  properties:
    component:
      type: object
      $ref: designbook/design/schemas.yml#/Component
    # keep non-spread params as-is
```

- [ ] **Step 3: Rewrite body templates**

Every `{{ component_id }}` / `{{ slots }}` / `{{ variants }}` that referenced a spread field becomes `{{ component.component_id }}` / `{{ component.slots }}` / `{{ component.variants }}`. Keep `{{ component }}` references only where the whole object is intended (e.g. nested `each: { variant: "component.variants" }`).

- [ ] **Step 4: Upstream check**

Find the stage that produces `components[]`. Confirm items are emitted as whole `Component` objects. If any step emits flat fields (`component_id`, …) at the item level without a wrapping object, wrap them.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook-drupal/components/tasks/create-component.md
git commit -m "refactor(skill): create-component uses explicit each binding"
```

### Task 16: Migrate `capture-storybook.md` (+ body template rewrite)

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/capture-storybook.md`

- [ ] **Step 1: Rewrite `each:`**

Before:

```yaml
each:
  checks:
    $ref: ../schemas.yml#/Check
```

After:

```yaml
each:
  check:
    expr: "checks"
    schema: { $ref: ../schemas.yml#/Check }
```

- [ ] **Step 2: Rewrite templates in body + paths**

Every `{story_id}` / `{{ story_id }}` becomes `{{ check.story_id }}`. Same for `breakpoint`, `region`, any other field on the check object.

Example (result path):

Before:

```yaml
path: designbook/stories/{story_id}/screenshots/{breakpoint}--{region}.png
```

After:

```yaml
path: "designbook/stories/{{ check.story_id }}/screenshots/{{ check.breakpoint }}--{{ check.region }}.png"
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/capture-storybook.md
git commit -m "refactor(skill): capture-storybook uses check binding"
```

### Task 17: Migrate `capture-reference.md`, `compare-screenshots.md`

Same pattern as Task 16. Both iterate `checks` → binding `check`, rewrite body templates.

- [ ] **Step 1: `capture-reference.md`** — rewrite `each:` + `{{ check.… }}`
- [ ] **Step 2: `compare-screenshots.md`** — rewrite `each:` + `{{ check.… }}`
- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/capture-reference.md \
        .agents/skills/designbook/design/tasks/compare-screenshots.md
git commit -m "refactor(skill): capture/compare use check binding"
```

### Task 18: Migrate `create-section.md`

**Files:**
- Modify: `.agents/skills/designbook/sections/tasks/create-section.md`

Current `params.required: [section_id, section_title, description, order, vision]` relies on field-spread. This task gets the biggest reshape in Phase 4 — concrete reference for the pattern applied to all field-spread tasks.

- [ ] **Step 1: Rewrite `each:`**

```yaml
each:
  section:
    expr: "sections"
    schema: { $ref: ../schemas.yml#/Section }
```

- [ ] **Step 2: Collapse `params:` into one object**

Before:

```yaml
params:
  required: [section_id, section_title, description, order, vision]
  properties:
    section_id:    { type: string, title: Section ID }
    section_title: { type: string, title: Section Title }
    description:   { type: string, title: Description }
    order:         { type: integer, title: Order }
    vision: { … }
    sections_dir: { … }
    scene_path: { … }
```

After:

```yaml
params:
  required: [section, vision]
  properties:
    section:
      type: object
      $ref: ../schemas.yml#/Section
    vision: { … }
    sections_dir: { … }
    scene_path:
      type: string
      resolve: scene_path
      from: section.section_id      # resolver input now nested
```

- [ ] **Step 3: Rewrite templates**

Every spread-field reference in the body becomes binding-qualified:

```
{{ section_id }}      →  {{ section.section_id }}
{{ section_title }}   →  {{ section.section_title }}
{{ description }}     →  {{ section.description }}
{{ order }}           →  {{ section.order }}
```

Applies to the "Output Format" YAML snippet (lines 73–92 in current source), the constraint bullets (around line 101), and the result `path:` if it references spread fields.

- [ ] **Step 4: Confirm `scene_path` resolver accepts nested `from:`**

The resolver registry already accepts `from: <path>` — verify by grepping `resolveResolverInputs` or equivalent. If `from:` is hardcoded to flat keys, extend it to support dotted paths (small fix, keep in this task).

- [ ] **Step 5: Upstream check**

Grep the sections workflow for where `sections[]` is produced (likely `sections/tasks/intake.md` or similar). Confirm items are `Section` objects, not flat fields.

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook/sections/tasks/create-section.md
git commit -m "refactor(skill): create-section uses explicit section binding"
```

### Task 18b: Migrate remaining single-axis tasks

**Files (one commit, pattern matches Task 18):**
- `.agents/skills/designbook/design/tasks/polish.md` — `each: issues` → `each: { issue: "issues" }`, templates `{{ issue.… }}`, collapse issue-fields in params
- `.agents/skills/designbook/design/tasks/map-entity--design-screen.md` — `each: entity_mappings` → `each: { mapping: "entity_mappings" }`, templates `{{ mapping.… }}`
- `.agents/skills/designbook/css-generate/tasks/generate-jsonata.md` — `each: group` → `each: { group: "groups" }`, templates `{{ group.… }}`
- `.agents/skills/designbook/import/tasks/run-workflow.md` — `each: workflow` → `each: { workflow: "workflows" }`, templates `{{ workflow.… }}`

- [ ] **Step 1: For each file, apply the 6-step pattern from Task 18** (`each`, `params`, templates, resolver `from:` paths, upstream check, verify)
- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook/design/tasks/polish.md \
        .agents/skills/designbook/design/tasks/map-entity--design-screen.md \
        .agents/skills/designbook/css-generate/tasks/generate-jsonata.md \
        .agents/skills/designbook/import/tasks/run-workflow.md
git commit -m "refactor(skill): migrate remaining each: blocks to explicit binding"
```

### Task 19: Update documentation

**Files:**
- Modify: `.agents/skills/designbook/resources/task-format.md`
- Modify: `.agents/skills/designbook/resources/architecture.md`
- Modify: `.agents/skills/designbook-skill-creator/resources/schemas.md`

- [ ] **Step 1: Rewrite every `each:` example**

Every doc example should show the new syntax:

```yaml
each:
  <binding>:
    expr: "<jsonata-expression>"
    schema: { $ref: … }
```

Add a short JSONata primer section to `task-format.md` pointing to `interpolate()` semantics:
- Dotted paths (`{{ variant.id }}`)
- Array filters (`{{ variants[published=true] }}`)
- Built-ins (`$lowercase`, `$join`, `$count`)
- `$env` for environment variables
- `$i` / `$total` inside `each`-expanded tasks

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook/resources/task-format.md \
        .agents/skills/designbook/resources/architecture.md \
        .agents/skills/designbook-skill-creator/resources/schemas.md
git commit -m "docs(skill): document JSONata interpolator and explicit each binding"
```

---

## Phase 5 — End-to-End Validation

### Task 20: Full quality gate

- [ ] **Step 1: Run check**

```bash
pnpm check
```

Expected: typecheck + lint + test all green.

### Task 21: Integration smoke — re-run the shell workflow that exposed the bug

- [ ] **Step 1: Fresh workspace**

```bash
rm -rf workspaces/drupal-web
./scripts/setup-workspace.sh drupal-web
./scripts/setup-test.sh drupal-web design-shell --into workspaces/drupal-web
```

- [ ] **Step 2: Run the original failing workflow**

From `workspaces/drupal-web`, run the design-shell prompt (same as the case that originally hit the bug). Confirm:

1. No file named `navigation.{{ variant.id }}.story.yml` appears anywhere under `components/navigation/`.
2. Two distinct files exist: `navigation.main.story.yml` and `navigation.footer.story.yml`.
3. Validate stage passes without the Vite "Failed to fetch dynamically imported module" error.
4. Workflow archives cleanly.

- [ ] **Step 3: Grep for stale syntax**

```bash
grep -rn "{{\s*[^}]*\s*}}" workspaces/drupal-web/designbook/ --include="*.yml" | grep -v "stories" || echo "clean"
```

Expected: `clean` — no literal `{{ … }}` left unresolved in generated artifacts.

### Task 22: Final commit

- [ ] **Step 1: Last `pnpm check`**

```bash
pnpm check
```

- [ ] **Step 2: No-op or cleanup commit**

If any cleanup surfaced during validation, commit. Otherwise skip.

---

## Spec Coverage Check

| Spec item | Implemented in |
|-----------|----------------|
| JSONata-backed unified interpolator | Tasks 3–4 |
| Drop `expandParams` / `expandFilePath` regex code | Tasks 5, 7 |
| Async propagation through callers | Task 6 |
| Resolver `from:` as JSONata expression | Task 6b |
| Expression cache (compile once per template) | Task 4 |
| `$env` env-var access via same evaluator | Task 4 |
| Upstream producer audit (iterable item shape) | Task 13b |
| New `each:` syntax (binding: expr) | Tasks 9–11 |
| Cross-product iteration | Tasks 9–10 |
| `$i` / `$total` iteration helpers | Tasks 9–10 |
| Drop `singularize` heuristic | Task 11 |
| Migrate all 10 task-file `each:` blocks | Tasks 14–18b |
| Collapse spread-field params into object params | Tasks 15, 18, 18b |
| Migrate all template bodies to new binding names | Tasks 16–18b |
| Confirm upstream stages emit object items | Tasks 15, 18, 18b |
| Update docs (task-format, architecture, skill-creator) | Task 19 |
| Regression: original shell workflow passes | Task 21 |

---

## Risks and Open Points

**Async propagation blast radius.** Every caller of `expandParams` / `expandFilePath` becomes async. If the addon has a synchronous entry point that can't easily accept async, Task 6 grows. The one-phase shim in Task 5 is specifically to let Task 6 migrate callers in isolation; if a stubborn caller appears, consider keeping the shim permanently (calling `.then(...)` internally) rather than dragging async into hot paths.

**JSONata error messages.** Raw JSONata errors (`T1006: Unknown function`) are unfriendly. The wrapper in Task 4 prefixes them with the template context, which is enough for most cases, but users may still see stack traces. Acceptable for internal tooling; revisit if non-authors hit these.

**Templates that relied on field-spread — primary migration surface.** Nearly every `each:`-using task today relies on field-spread (`each: checks` → `{{ story_id }}`, `each: section` → `{{ section_id }}`, …). Moving to unified binding means every body template, every `params.required` list that referenced item fields, and every `result.path:` that used them gets rewritten — plus possibly each upstream stage that produces the iterable in flat-field shape. A missed occurrence shows up as `Unknown expression: {{ story_id }}` at workflow run time, which is loud enough to catch in Task 21, but the scope of Phase 4 is proportionally larger than for the interpolator itself.

**`${VAR}` rewriter edge case.** The regex `(?<![\w$])\$([A-Z_][A-Z0-9_]*)` skips `$$` and identifier-suffix cases. Bash snippets inside markdown code fences that contain `${FOO}` are also rewritten by the pre-pass — that's fine because they never reach a JSONata evaluator (bodies aren't interpolated), but if we ever start interpolating task bodies, fenced code must be excluded.

**`$i` / `$total` in existing tasks.** New helpers are additive; no existing task references them, so zero regression surface.

**Rollback path.** Commits are phased (Phase 2 isolated from Phase 3 isolated from Phase 4). `git revert` on any single phase restores previous behavior without touching the others. If Phase 4 fails mid-migration, the addon still runs because Phases 2+3 accept both old and new `each:` shapes through one cycle — actually no, Task 11 deletes the old resolver outright. If mid-Phase-4 rollback is needed, revert the Phase 3 commit too.
