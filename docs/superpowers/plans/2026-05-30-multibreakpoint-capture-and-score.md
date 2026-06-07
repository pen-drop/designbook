# Multi-Breakpoint Capture + Fidelity Score (Plan 1 of 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the region-properties walker capture mobile-first per-breakpoint deviations, and add a deterministic fidelity-score helper — the addon foundation the design-verify split (Plan 2) builds on.

**Architecture:** Addon-only. `capture()` walks the page at each breakpoint width and merges the trees into one mobile-first `CapturedSource` (smallest breakpoint = base; larger breakpoints carry per-node `overrides`, aligned by `dom_path`). A pure `computeFidelityScore(issues)` helper replaces the AI-in-body score. Schema for `PropertyNode.overrides` / `base_breakpoint` is added so the output is validatable.

**Tech Stack:** TypeScript (strict, ESM), vitest, jsdom (pure unit), playwright (capture integration), js-yaml.

**Spec:** `docs/superpowers/specs/2026-05-30-firstshot-score-responsive-capture-design.md` (Features 1, 2; the `PropertyNode`/`base_breakpoint` parts of Feature 4's schema).

---

## File Structure

```
packages/storybook-addon-designbook/src/
  scoring/composite.ts                      # + computeFidelityScore (pure)
  scoring/__tests__/composite.test.ts       # + score tests
  inspect/element-walker.ts                 # + overrides/base_breakpoint types (no walk behavior change)
  inspect/breakpoint-widths.ts              # NEW: resolveBreakpointWidths(config, names)
  inspect/__tests__/breakpoint-widths.test.ts  # NEW
  inspect/merge-breakpoints.ts              # NEW: pure mergeBreakpointTrees(captures)
  inspect/__tests__/merge-breakpoints.test.ts  # NEW
  inspect/capture.ts                        # multi-breakpoint capture (loop widths -> merge)
  inspect/__tests__/capture.test.ts         # + multi-bp integration assertions
  resolvers/region-properties.ts            # pass breakpoint widths to capture
tests/fixtures/element-walker/
  responsive-page.html                      # NEW: @media responsive fixture
.agents/skills/designbook/design/schemas.yml  # PropertyNode.overrides + base_breakpoint (load designbook-skill-creator first)
```

---

## Task 1: `computeFidelityScore` helper

**Files:**
- Modify: `packages/storybook-addon-designbook/src/scoring/composite.ts`
- Test: `packages/storybook-addon-designbook/src/scoring/__tests__/composite.test.ts`

- [ ] **Step 1: Write the failing test** — append to `composite.test.ts`:

```ts
import { computeFidelityScore } from '../composite.js';

describe('computeFidelityScore', () => {
  it('is 0 for no issues', () => {
    expect(computeFidelityScore([])).toBe(0);
  });
  it('weights critical=3, major=2, minor=1 and sums across checks', () => {
    const issues = [
      { severity: 'critical', description: 'a' },
      { severity: 'critical', description: 'b' },
      { severity: 'major', description: 'c' },
      { severity: 'minor', description: 'd' },
    ];
    // 2*3 + 1*2 + 1*1 = 9
    expect(computeFidelityScore(issues)).toBe(9);
  });
  it('ignores unknown severities', () => {
    expect(computeFidelityScore([{ severity: 'info', description: 'x' }])).toBe(0);
  });
});
```

- [ ] **Step 2: Run it, expect fail**

Run: `cd packages/storybook-addon-designbook && pnpm vitest run src/scoring/__tests__/composite.test.ts`
Expected: FAIL — `computeFidelityScore is not a function`.

- [ ] **Step 3: Implement** — append to `composite.ts`:

```ts
export interface FidelityIssue {
  severity: string;
  [k: string]: unknown;
}

const SEVERITY_WEIGHT: Record<string, number> = { critical: 3, major: 2, minor: 1 };

/**
 * Deterministic visual-fidelity score for a verify run. Sum of severity
 * weights over all issues across all checks. Lower is better; 0 = perfect.
 */
export function computeFidelityScore(issues: FidelityIssue[]): number {
  let score = 0;
  for (const issue of issues) {
    score += SEVERITY_WEIGHT[issue.severity] ?? 0;
  }
  return score;
}
```

- [ ] **Step 4: Run it, expect pass**

Run: `cd packages/storybook-addon-designbook && pnpm vitest run src/scoring/__tests__/composite.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/scoring/composite.ts packages/storybook-addon-designbook/src/scoring/__tests__/composite.test.ts
git commit -m "feat(addon): computeFidelityScore — deterministic severity-weighted fidelity score"
```

---

## Task 2: Walker types for breakpoint overrides

Add the type surface to `element-walker.ts`. No change to the single-breakpoint walk behavior — `walkDocument` stays as-is; only the exported types grow so `capture.ts`/`merge-breakpoints.ts` can produce the merged shape.

**Files:**
- Modify: `packages/storybook-addon-designbook/src/inspect/element-walker.ts`

- [ ] **Step 1: Add the override/base types**

In `element-walker.ts`, add a `StyleOverride` type and extend `PropertyNode` + `CapturedSource`:

```ts
export interface StyleOverride {
  hidden?: boolean;
  style?: Partial<CapturedSourceStyle>;
  bbox?: BBox;
}
```

Add to `PropertyNode` (after `source`):
```ts
  /** Per-breakpoint deviations from the mobile-first base. Key = breakpoint name. */
  overrides?: Record<string, StyleOverride>;
```

Add to `CapturedSource` (after `adapter_version`):
```ts
  /** Smallest captured breakpoint — the mobile-first base for `nodes[].style`. Absent for single-viewport captures. */
  base_breakpoint?: string;
```

- [ ] **Step 2: Typecheck**

Run: `cd packages/storybook-addon-designbook && pnpm typecheck`
Expected: PASS (existing tests unaffected — fields are optional).

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/inspect/element-walker.ts
git commit -m "feat(addon): walker types for per-breakpoint overrides + base_breakpoint"
```

---

## Task 3: `resolveBreakpointWidths` helper

Resolve breakpoint names → pixel widths, mirroring how the capture stages size viewports: prefer `design-tokens.yml` `semantic.breakpoints.<name>.$value` (a `px` dimension), else the known Tailwind defaults. Unknown names are dropped (logged by the caller).

**Files:**
- Create: `packages/storybook-addon-designbook/src/inspect/breakpoint-widths.ts`
- Test: `packages/storybook-addon-designbook/src/inspect/__tests__/breakpoint-widths.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { resolveBreakpointWidths } from '../breakpoint-widths.js';

describe('resolveBreakpointWidths', () => {
  it('uses Tailwind defaults when tokens lack breakpoints', () => {
    const r = resolveBreakpointWidths({ data: '/nonexistent' } as never, ['sm', 'xl']);
    expect(r).toEqual([
      { name: 'sm', width: 640 },
      { name: 'xl', width: 1280 },
    ]);
  });
  it('sorts ascending by width regardless of input order', () => {
    const r = resolveBreakpointWidths({ data: '/nonexistent' } as never, ['xl', 'sm']);
    expect(r.map((b) => b.name)).toEqual(['sm', 'xl']);
  });
  it('drops unknown breakpoint names', () => {
    const r = resolveBreakpointWidths({ data: '/nonexistent' } as never, ['sm', 'bogus']);
    expect(r).toEqual([{ name: 'sm', width: 640 }]);
  });
});
```

- [ ] **Step 2: Run it, expect fail**

Run: `cd packages/storybook-addon-designbook && pnpm vitest run src/inspect/__tests__/breakpoint-widths.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import type { DesignbookConfig } from '../config.js';

export interface BreakpointWidth {
  name: string;
  width: number;
}

// Mirrors src/components/VisualCompareTool.tsx KNOWN_BREAKPOINTS.
const KNOWN_BREAKPOINTS: Record<string, number> = { sm: 640, md: 768, lg: 1024, xl: 1280 };

const TOKENS_PATH = 'design-system/design-tokens.yml';

function widthsFromTokens(dataDir: string): Record<string, number> {
  const file = join(dataDir, TOKENS_PATH);
  if (!existsSync(file)) return {};
  let parsed: unknown;
  try {
    parsed = load(readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
  const semantic = (parsed as { semantic?: { breakpoints?: Record<string, unknown> } })?.semantic;
  const bps = semantic?.breakpoints;
  if (!bps || typeof bps !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [name, def] of Object.entries(bps)) {
    if (name.startsWith('$')) continue;
    const raw = (def as { $value?: unknown })?.$value;
    const px = typeof raw === 'string' ? Number.parseInt(raw, 10) : typeof raw === 'number' ? raw : NaN;
    if (Number.isFinite(px) && px > 0) out[name] = px;
  }
  return out;
}

/**
 * Resolve breakpoint names to pixel widths, ascending. Token-defined widths win;
 * otherwise Tailwind defaults. Names with no known width are dropped.
 */
export function resolveBreakpointWidths(config: DesignbookConfig, names: string[]): BreakpointWidth[] {
  const tokenWidths = widthsFromTokens(config.data);
  const out: BreakpointWidth[] = [];
  for (const name of names) {
    const width = tokenWidths[name] ?? KNOWN_BREAKPOINTS[name];
    if (typeof width === 'number') out.push({ name, width });
  }
  return out.sort((a, b) => a.width - b.width);
}
```

- [ ] **Step 4: Run it, expect pass**

Run: `cd packages/storybook-addon-designbook && pnpm vitest run src/inspect/__tests__/breakpoint-widths.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/inspect/breakpoint-widths.ts packages/storybook-addon-designbook/src/inspect/__tests__/breakpoint-widths.test.ts
git commit -m "feat(addon): resolveBreakpointWidths — breakpoint name to px (tokens + tailwind defaults)"
```

---

## Task 4: `mergeBreakpointTrees` — mobile-first merge (pure)

Merge per-breakpoint `CapturedSource`s (ascending widths) into ONE mobile-first source. Nodes align by `dom_path` (= `source.locator`, stable across widths, unlike the bbox-based `id`). The smallest breakpoint is the base; larger breakpoints contribute `overrides`.

**Files:**
- Create: `packages/storybook-addon-designbook/src/inspect/merge-breakpoints.ts`
- Test: `packages/storybook-addon-designbook/src/inspect/__tests__/merge-breakpoints.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { mergeBreakpointTrees } from '../merge-breakpoints.js';
import type { CapturedSource, PropertyNode } from '../element-walker.js';

function node(locator: string, extra: Partial<PropertyNode> = {}): PropertyNode {
  return {
    id: `id_${locator}`,
    child_ids: [],
    label: locator,
    kind: 'container',
    bbox: { x: 0, y: 0, width: 100, height: 20 },
    style: { padding: '0', margin: '0', background: '#ffffff' },
    source: { locator },
    ...extra,
  };
}

function src(nodes: PropertyNode[]): CapturedSource {
  return { source_kind: 'url-dom', source_ref: 'u', captured_at: 't', adapter_version: 'v', nodes };
}

describe('mergeBreakpointTrees', () => {
  it('uses the smallest breakpoint as base and sets base_breakpoint', () => {
    const merged = mergeBreakpointTrees([
      { name: 'sm', source: src([node('body')]) },
      { name: 'xl', source: src([node('body')]) },
    ]);
    expect(merged.base_breakpoint).toBe('sm');
    expect(merged.nodes).toHaveLength(1);
  });

  it('records a style override where a node differs at a larger breakpoint', () => {
    const merged = mergeBreakpointTrees([
      { name: 'sm', source: src([node('nav', { style: { padding: '0', margin: '0', background: '#fff', layout: 'flex-col' } })]) },
      { name: 'xl', source: src([node('nav', { style: { padding: '0', margin: '0', background: '#fff', layout: 'flex-row' } })]) },
    ]);
    const nav = merged.nodes.find((n) => n.source.locator === 'nav')!;
    expect(nav.style.layout).toBe('flex-col'); // base = mobile
    expect(nav.overrides?.xl?.style?.layout).toBe('flex-row');
  });

  it('marks a node hidden at base when it only appears at a larger breakpoint', () => {
    const merged = mergeBreakpointTrees([
      { name: 'sm', source: src([node('body')]) },
      { name: 'xl', source: src([node('body'), node('searchbar')]) },
    ]);
    const search = merged.nodes.find((n) => n.source.locator === 'searchbar')!;
    expect(search.overrides?.sm?.hidden).toBe(true);
  });

  it('marks a node hidden at a larger breakpoint when it drops out there', () => {
    const merged = mergeBreakpointTrees([
      { name: 'sm', source: src([node('body'), node('burger')]) },
      { name: 'xl', source: src([node('body')]) },
    ]);
    const burger = merged.nodes.find((n) => n.source.locator === 'burger')!;
    expect(burger.overrides?.xl?.hidden).toBe(true);
  });

  it('passes a single breakpoint through unchanged (no overrides)', () => {
    const merged = mergeBreakpointTrees([{ name: 'sm', source: src([node('body')]) }]);
    expect(merged.base_breakpoint).toBe('sm');
    expect(merged.nodes[0]!.overrides).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it, expect fail**

Run: `cd packages/storybook-addon-designbook && pnpm vitest run src/inspect/__tests__/merge-breakpoints.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { BBox, CapturedSource, CapturedSourceStyle, PropertyNode, StyleOverride } from './element-walker.js';

export interface BreakpointCapture {
  name: string;
  source: CapturedSource;
}

const STYLE_KEYS: (keyof CapturedSourceStyle)[] = [
  'layout', 'main_axis_align', 'cross_axis_align', 'gap', 'padding', 'margin', 'border',
  'border_radius', 'background', 'foreground', 'font_family', 'font_size', 'font_weight',
  'line_height', 'letter_spacing', 'text_transform',
];

function styleDiff(base: CapturedSourceStyle, other: CapturedSourceStyle): Partial<CapturedSourceStyle> {
  const diff: Partial<CapturedSourceStyle> = {};
  for (const k of STYLE_KEYS) {
    if (other[k] !== base[k]) {
      // @ts-expect-error — key-indexed copy across a union-valued record
      diff[k] = other[k];
    }
  }
  return diff;
}

/**
 * Merge per-breakpoint captures into one mobile-first CapturedSource. Input MUST
 * be ascending by width (smallest first). Nodes align by `source.locator`
 * (dom_path). The smallest breakpoint is the base; larger breakpoints add
 * `overrides[bp]` (style diffs + visibility). A node missing at a breakpoint is
 * `hidden` there; a node missing from the base appears with `overrides[base].hidden`.
 */
export function mergeBreakpointTrees(captures: BreakpointCapture[]): CapturedSource {
  const base = captures[0]!;
  const baseSource = base.source;

  // Single breakpoint → pass through, just stamp base_breakpoint.
  if (captures.length === 1) {
    return { ...baseSource, base_breakpoint: base.name };
  }

  // Index every breakpoint's nodes by dom_path.
  const byBp = captures.map((c) => {
    const map = new Map<string, PropertyNode>();
    for (const n of c.source.nodes) map.set(n.source.locator, n);
    return { name: c.name, map };
  });
  const baseMap = byBp[0]!.map;

  // Union of dom_paths, base order first then any later-only nodes in encounter order.
  const order: string[] = [];
  const seen = new Set<string>();
  for (const c of byBp) {
    for (const locator of c.map.keys()) {
      if (!seen.has(locator)) {
        seen.add(locator);
        order.push(locator);
      }
    }
  }

  const mergedNodes: PropertyNode[] = order.map((locator) => {
    // Canonical node = base node if present, else its first appearance.
    const firstBp = byBp.find((c) => c.map.has(locator))!;
    const canonical = baseMap.get(locator) ?? firstBp.map.get(locator)!;
    const node: PropertyNode = { ...canonical };
    const overrides: Record<string, StyleOverride> = {};

    const presentInBase = baseMap.has(locator);
    if (!presentInBase) {
      // Hidden at base (mobile); style carried from first appearance.
      overrides[base.name] = { hidden: true };
    }

    for (let i = 1; i < byBp.length; i++) {
      const bp = byBp[i]!;
      const here = bp.map.get(locator);
      if (!here) {
        if (presentInBase) overrides[bp.name] = { hidden: true };
        continue;
      }
      const ov: StyleOverride = {};
      if (!presentInBase) ov.hidden = false; // revealed relative to mobile base
      const sd = styleDiff(node.style, here.style);
      if (Object.keys(sd).length > 0) ov.style = sd;
      if (bboxChanged(node.bbox, here.bbox)) ov.bbox = here.bbox;
      if (ov.hidden !== undefined || ov.style || ov.bbox) overrides[bp.name] = ov;
    }

    if (Object.keys(overrides).length > 0) node.overrides = overrides;
    return node;
  });

  return { ...baseSource, base_breakpoint: base.name, nodes: mergedNodes };
}

function bboxChanged(a: BBox, b: BBox): boolean {
  return a.width !== b.width || a.height !== b.height || a.x !== b.x || a.y !== b.y;
}
```

- [ ] **Step 4: Run it, expect pass**

Run: `cd packages/storybook-addon-designbook && pnpm vitest run src/inspect/__tests__/merge-breakpoints.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/inspect/merge-breakpoints.ts packages/storybook-addon-designbook/src/inspect/__tests__/merge-breakpoints.test.ts
git commit -m "feat(addon): mergeBreakpointTrees — mobile-first per-node breakpoint overrides"
```

---

## Task 5: Multi-breakpoint `capture()`

Change `capture()` to accept breakpoint widths, walk once per width, and merge via `mergeBreakpointTrees`. When no breakpoints are given, behave exactly as today (single 1440 capture, no `base_breakpoint`).

**Files:**
- Modify: `packages/storybook-addon-designbook/src/inspect/capture.ts`

- [ ] **Step 1: Change the signature + loop**

Replace the `capture` signature and body so it accepts an optional ascending `widths` list and merges. Keep `waitForReady`/`parseTimeoutMs`/the timeout guard as-is. The new shape:

```ts
import { mergeBreakpointTrees, type BreakpointCapture } from './merge-breakpoints.js';
import type { CapturedSource } from './element-walker.js';

export interface CaptureBreakpoint {
  name: string;
  width: number;
}

/**
 * Launch headless chromium, walk the page at each breakpoint width, and write a
 * mobile-first merged CapturedSource to `outPath`. With no breakpoints, captures
 * once at the default viewport (legacy single-shot behavior).
 */
export async function capture(url: string, outPath: string, breakpoints: CaptureBreakpoint[] = []): Promise<void> {
  const totalTimeoutMs = parseTimeoutMs();
  await mkdir(dirname(outPath), { recursive: true });

  const widths = breakpoints.length > 0 ? breakpoints : [{ name: '', width: 1440 }];

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    const captures = await new Promise<BreakpointCapture[]>((resolveOuter, rejectOuter) => {
      timeoutHandle = setTimeout(() => {
        rejectOuter(new Error(`capture timed out after ${totalTimeoutMs}ms`));
        browser.close().catch(() => {});
      }, totalTimeoutMs);

      (async () => {
        const context = await browser.newContext({ viewport: { width: widths[0]!.width, height: 1600 } });
        const page = await context.newPage();
        try {
          await page.goto(url);
          await waitForReady(page, totalTimeoutMs);
          const out: BreakpointCapture[] = [];
          for (const bp of widths) {
            await page.setViewportSize({ width: bp.width, height: 1600 });
            await page.waitForTimeout(300); // let responsive layout settle
            const source = (await page.evaluate(
              ({ ref, script, width }: { ref: string; script: string; width: number }) => {
                eval(script);
                const walk = (globalThis as unknown as {
                  __designbookWalkDocument: (
                    doc: Document,
                    opts: { sourceRef: string; viewport: { width: number; height: number } },
                  ) => unknown;
                }).__designbookWalkDocument;
                return walk(document, { sourceRef: ref, viewport: { width, height: 1600 } });
              },
              { ref: url, script: PAGE_SCRIPT, width: bp.width },
            )) as CapturedSource;
            out.push({ name: bp.name, source });
          }
          resolveOuter(out);
        } finally {
          await context.close().catch(() => {});
        }
      })().catch(rejectOuter);
    });

    const merged = breakpoints.length > 0 ? mergeBreakpointTrees(captures) : captures[0]!.source;
    await writeFile(outPath, JSON.stringify(merged, null, 2));
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    await browser.close().catch(() => {});
  }
}
```

(Remove the old single `page.evaluate`+`writeFile` block; the loop replaces it.)

- [ ] **Step 2: Typecheck**

Run: `cd packages/storybook-addon-designbook && pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/inspect/capture.ts
git commit -m "feat(addon): capture() walks per breakpoint width and merges mobile-first"
```

---

## Task 6: Responsive fixture + capture integration test

**Files:**
- Create: `tests/fixtures/element-walker/responsive-page.html`
- Modify: `packages/storybook-addon-designbook/src/inspect/__tests__/capture.test.ts`

- [ ] **Step 1: Create the fixture** — a nav that is `display:none` below 1000px and `flex` above, plus a burger that is the inverse:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Responsive Fixture</title>
  <style>
    body { margin: 0; font-family: sans-serif; }
    header { display: flex; align-items: center; padding: 0 24px; height: 64px; background: #ffffff; }
    .nav { display: none; gap: 16px; }
    .burger { display: block; }
    @media (min-width: 1000px) {
      .nav { display: flex; }
      .burger { display: none; }
    }
  </style>
</head>
<body>
  <header role="banner">
    <a href="/" class="logo">Brand</a>
    <nav class="nav" role="navigation">
      <a href="/a">Products</a>
      <a href="/b">Pricing</a>
    </nav>
    <button class="burger" aria-label="Menü">≡</button>
  </header>
  <main role="main"><h1>Responsive</h1></main>
</body>
</html>
```

- [ ] **Step 2: Add the integration test** — append to `capture.test.ts`:

```ts
describe('capture (multi-breakpoint, real chromium)', () => {
  const RESP_URL = pathToFileURL(
    join(__dirname, '../../../../../tests/fixtures/element-walker/responsive-page.html'),
  ).href;
  let dir: string;
  let merged: CapturedSource;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'designbook-capture-bp-'));
    const out = join(dir, 'source.json');
    await capture(RESP_URL, out, [
      { name: 'sm', width: 640 },
      { name: 'xl', width: 1280 },
    ]);
    merged = JSON.parse(await readFile(out, 'utf8')) as CapturedSource;
  }, 60_000);

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('is mobile-first (base_breakpoint = smallest)', () => {
    expect(merged.base_breakpoint).toBe('sm');
  });

  it('nav hidden at mobile base, revealed at xl', () => {
    const nav = merged.nodes.find((n) => n.role === 'navigation');
    expect(nav).toBeDefined();
    // Hidden at sm (display:none) → only present because xl revealed it.
    expect(nav!.overrides?.sm?.hidden).toBe(true);
    expect(nav!.overrides?.xl?.hidden).toBe(false);
  });

  it('burger present at base, hidden at xl', () => {
    const burger = merged.nodes.find((n) => n.label === 'Menü' || n.kind === 'button');
    expect(burger).toBeDefined();
    expect(burger!.overrides?.xl?.hidden).toBe(true);
  });
});
```

> `pathToFileURL`, `mkdtemp`, `readFile`, `rm`, `tmpdir`, `join`, `CapturedSource` are already imported at the top of `capture.test.ts` from Task-10 of the prior plan; if any is missing add it.

- [ ] **Step 3: Run it, expect pass**

Run: `cd packages/storybook-addon-designbook && npx playwright install chromium >/dev/null 2>&1; pnpm vitest run src/inspect/__tests__/capture.test.ts`
Expected: PASS (existing single-bp tests + 3 new multi-bp tests).

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/element-walker/responsive-page.html packages/storybook-addon-designbook/src/inspect/__tests__/capture.test.ts
git commit -m "test(addon): multi-breakpoint capture integration (mobile-first nav/burger)"
```

---

## Task 7: Resolver passes breakpoint widths to capture

The resolver already runs at `create-component`. It reads the workflow's `breakpoints` param (comma list or array) and resolves widths via `resolveBreakpointWidths`, passing them to `capture()`.

**Files:**
- Modify: `packages/storybook-addon-designbook/src/resolvers/region-properties.ts`
- Test: `packages/storybook-addon-designbook/src/resolvers/__tests__/region-properties.test.ts`

- [ ] **Step 1: Update the resolver**

Add the import:
```ts
import { resolveBreakpointWidths } from '../inspect/breakpoint-widths.js';
```

Replace the cache-miss `capture(url, sourcePath)` call with a breakpoint-aware one. Just before the `if (!existsSync(sourcePath))` block, derive the names:
```ts
    const bpParam = context.params.breakpoints;
    const bpNames =
      typeof bpParam === 'string'
        ? bpParam.split(',').map((s) => s.trim()).filter(Boolean)
        : Array.isArray(bpParam)
          ? bpParam.filter((x): x is string => typeof x === 'string')
          : [];
    const breakpointWidths = resolveBreakpointWidths(context.config as DesignbookConfig, bpNames);
```
Add the type import at the top:
```ts
import type { DesignbookConfig } from '../config.js';
```
And change the capture call:
```ts
        await capture(url, sourcePath, breakpointWidths);
```

- [ ] **Step 2: Add a resolver test** — append to `region-properties.test.ts`, extending the existing capture mock to capture its args:

```ts
it('passes resolved breakpoint widths to capture on cache miss', async () => {
  existsValue = false;
  await regionPropertiesResolver.resolve(
    'https://example.com',
    {},
    buildContext({ component: { component: 'header' }, breakpoints: 'sm,xl' }),
  );
  expect(captureMock).toHaveBeenCalledTimes(1);
  const args = captureMock.mock.calls[0]!;
  // (url, outPath, breakpoints)
  expect(args[2]).toEqual([
    { name: 'sm', width: 640 },
    { name: 'xl', width: 1280 },
  ]);
});
```

> The capture mock at the top of the file is `vi.fn(async (..._args: unknown[]) => undefined)`; `captureMock.mock.calls[0][2]` is the third arg. No mock change needed.

- [ ] **Step 3: Run it, expect pass**

Run: `cd packages/storybook-addon-designbook && pnpm vitest run src/resolvers/__tests__/region-properties.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/region-properties.ts packages/storybook-addon-designbook/src/resolvers/__tests__/region-properties.test.ts
git commit -m "feat(addon): region_properties resolves breakpoint widths and passes them to capture"
```

---

## Task 8: Schema — `PropertyNode.overrides` + `base_breakpoint`

**REQUIRED FIRST:** Invoke the `designbook-skill-creator` skill and load `rules/schema-files.md` + `rules/common-rules.md` before editing `schemas.yml`.

**Files:**
- Modify: `.agents/skills/designbook/design/schemas.yml`

- [ ] **Step 1: Load skill-creator**, then locate the existing `PropertyNode` and `CapturedSource`/`RegionProperties` definitions in `schemas.yml`.

- [ ] **Step 2: Add `overrides` to `PropertyNode`** (after its `source` property), with teaching signals per SCHEMA-02:

```yaml
    overrides:
      type: object
      description: >
        Per-breakpoint deviations from the mobile-first base style. Key is the
        breakpoint name. Absent when the node is identical across breakpoints.
        Consume as responsive utilities: base `style` → base classes,
        `overrides.<bp>` → the matching `<bp>:` prefix.
      additionalProperties:
        type: object
        properties:
          hidden: { type: boolean, description: "Node is not rendered at this breakpoint (or revealed=false at base)." }
          style:
            type: object
            description: Only the style properties that differ from the base at this breakpoint.
          bbox:
            $ref: "#/BBox"
      examples:
        - { xl: { hidden: false, style: { layout: flex-row } } }
```

- [ ] **Step 3: Add `base_breakpoint`** to the captured-source / region type (wherever `adapter_version` is declared):

```yaml
    base_breakpoint:
      type: string
      description: >
        Smallest captured breakpoint — the mobile-first base for node `style`.
        Absent for single-viewport captures.
      examples: [sm]
```

(If `BBox` is not yet a named type in this file, reference the inline bbox shape already used by `PropertyNode.bbox` instead of `$ref: "#/BBox"`.)

- [ ] **Step 4: Validate the skill files**

Run the skill validator per `designbook-skill-creator/resources/validate.md` against `design/schemas.yml` (or `pnpm check` if the validator runs in tests).
Expected: no SCHEMA-rule violations.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/schemas.yml
git commit -m "feat(designbook): schema for PropertyNode.overrides + base_breakpoint"
```

---

## Task 9: Full verification

- [ ] **Step 1: Run the full check**

Run: `cd /home/cw/projects/designbook/.claude/worktrees/region-properties-resolver && pnpm check`
Expected: typecheck → lint → test all PASS. If lint flags formatting: `pnpm --filter storybook-addon-designbook lint:fix` and re-run.

- [ ] **Step 2: Confirm capture integration ran**

Run: `cd packages/storybook-addon-designbook && pnpm vitest run src/inspect/__tests__/capture.test.ts`
Expected: PASS including the 3 multi-breakpoint tests.

- [ ] **Step 3: Final commit if lint:fix changed anything**

```bash
git add -A && git commit -m "chore: lint:fix after multi-breakpoint capture + score" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- Feature 1 (multi-breakpoint capture, mobile-first, dom_path join, overrides): Tasks 2,3,4,5,6,7 ✓
- Feature 2 (deterministic `computeFidelityScore`, 3/2/1): Task 1 ✓ (consumed by Plan 2's outtake)
- Feature 4 schema parts for capture output (`PropertyNode.overrides`, `base_breakpoint`): Task 8 ✓
- `VerifyResult`/`ScoreReport`, verify-capture/verify-fix/orchestrator, outtake tasks, workflow-summary: **Plan 2** (intentionally deferred).

**Placeholder scan:** none — every code step has complete code; the only conditional ("if BBox not a named type") gives an explicit alternative.

**Type consistency:** `CaptureBreakpoint {name,width}` (capture) vs `BreakpointWidth {name,width}` (breakpoint-widths) — same shape, distinct names by module; the resolver passes `BreakpointWidth[]` where `CaptureBreakpoint[]` is expected (structurally identical, compiles). `mergeBreakpointTrees` consumes `BreakpointCapture {name, source}`. `StyleOverride`/`overrides` keys match across element-walker, merge-breakpoints, schema, and the capture test (`hidden`, `style`, `bbox`).

**Note for executor:** Task 8 edits a skill file — load `designbook-skill-creator` first (mandated by CLAUDE.md).
