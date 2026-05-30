# Region Properties Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the region-properties walker from the skill into the CLI package, prune the skill integration to where it is actually consumed, and make the full capture path automatically testable.

**Architecture:** Split the monolithic `region-properties.ts` resolver into a focused `src/inspect/` module (walker, capture, region-matching), leaving the resolver as a thin orchestrator. Delete the skill-side walker `.js` and the `import(file://)` path-guessing. Add a real-chromium integration test against a local fixture.

**Tech Stack:** TypeScript (strict, ESM), vitest, jsdom (walker unit), playwright (capture), tsup bundler.

---

## File Structure

```
packages/storybook-addon-designbook/
  src/inspect/                       # NEW module — the "inspect a rendered page" capability
    element-walker.ts                # walkDocument + PAGE_SCRIPT + shared types (was skill .js)
    capture.ts                       # capture(): playwright launch/nav/wait/eval/write
    region.ts                        # locateRegion + helpers + RegionProperties (pure)
    __tests__/
      element-walker.test.ts         # jsdom (moved from src/__tests__/)
      region.test.ts                 # pure region matching (moved from resolver test)
      capture.test.ts                # NEW — real chromium vs file:// fixture
  src/resolvers/region-properties.ts # thin orchestrator
  src/resolvers/__tests__/region-properties.test.ts  # slimmed to orchestration only

tests/fixtures/element-walker/
  regions-page.html                  # NEW enriched fixture (multi-region, size-varied, hidden)

DELETED:
  .agents/skills/designbook/design/resources/element-walker.js
  .agents/skills/designbook/design/resources/element-walker.d.ts
  src/__tests__/element-walker.test.ts
```

Skill edits (Change 2 / Change 4):
```
.agents/skills/designbook/scenes/tasks/create-scene.md            # drop region_properties param
.agents/skills/designbook/design/rules/region-properties.md       # trigger → [create-component]
.agents/skills/designbook-css-tailwind/rules/region-properties.md # trigger → [create-component]
.agents/skills/designbook-drupal/components/rules/region-properties.md  # trigger → [create-component]
.agents/skills/designbook/resources/cli-playwright.md             # pin npx playwright-cli@<ver>
packages/storybook-addon-designbook/package.json                  # playwright → devDependencies
packages/integrations/test-integration-drupal/package.json        # playwright-cli pinned dep
```

---

## Task 1: Scaffold `src/inspect/element-walker.ts`

Move the walker into the package as a strict-typed `.ts`. Browser-side logic unchanged; add types for `tsc --strict`. `PAGE_SCRIPT` keeps serializing helpers via `fn.toString()` (TS types are stripped at runtime).

**Files:**
- Create: `packages/storybook-addon-designbook/src/inspect/element-walker.ts`

- [ ] **Step 1: Create the file**

```ts
// Element-property walker. Browser-side logic only — no node:* imports.
//
//   - walkDocument(doc, options): pure, jsdom-testable, returns CapturedSource
//   - PAGE_SCRIPT: serialized helpers + walkDocument for in-page eval()
//
// Node-side orchestration (launching Playwright, navigating, waiting, writing
// JSON) lives in ./capture.ts. The CapturedSource shape is source-agnostic:
// future Figma / screenshot walkers can produce the same shape.

export interface CapturedSourceViewport {
  width: number;
  height: number;
}

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CapturedSourceStyle {
  layout?: 'flex-row' | 'flex-col' | 'grid' | 'stack' | 'none';
  main_axis_align?: string;
  cross_axis_align?: string;
  gap?: string;
  padding: string;
  margin: string;
  border?: string;
  border_radius?: string;
  background: string;
  foreground?: string;
  font_family?: string;
  font_size?: string;
  font_weight?: string;
  line_height?: string;
  letter_spacing?: string;
  text_transform?: string;
}

export interface PropertyNode {
  id: string;
  parent_id?: string;
  child_ids: string[];
  label: string;
  kind: string;
  role?: string;
  heading_context?: string;
  bbox: BBox;
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
  style: CapturedSourceStyle;
  source: { locator: string; raw?: object };
}

export interface CapturedSource {
  source_kind: string;
  source_ref: string;
  captured_at: string;
  viewport?: CapturedSourceViewport;
  adapter_version: string;
  nodes: PropertyNode[];
}

export interface WalkDocumentOptions {
  sourceRef?: string;
  viewport?: CapturedSourceViewport;
}

const ADAPTER_VERSION = 'url-playwright/0.1.0';

const ROLE_TAG_MAP: Record<string, string> = {
  HEADER: 'banner',
  NAV: 'navigation',
  MAIN: 'main',
  FOOTER: 'contentinfo',
  ASIDE: 'complementary',
  SECTION: 'region',
  FORM: 'form',
};

const KIND_TAG_MAP: Record<string, string> = {
  H1: 'heading', H2: 'heading', H3: 'heading', H4: 'heading', H5: 'heading', H6: 'heading',
  P: 'text', SPAN: 'text', LABEL: 'text', LI: 'list-item',
  UL: 'list', OL: 'list',
  A: 'link', BUTTON: 'button',
  INPUT: 'input', TEXTAREA: 'input', SELECT: 'input',
  IMG: 'image', SVG: 'icon', PICTURE: 'image',
  VIDEO: 'media', AUDIO: 'media',
  HEADER: 'container', NAV: 'container', MAIN: 'container',
  FOOTER: 'container', SECTION: 'section', ARTICLE: 'section',
  FORM: 'form',
};

const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

function rgbToHex(value: string): string | undefined {
  if (!value) return '';
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/i);
  if (!m) return value;
  const alpha = m[4] === undefined ? 1 : parseFloat(m[4]);
  if (alpha === 0) return undefined;
  const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
  if (alpha >= 1) return `#${hex(m[1] as string)}${hex(m[2] as string)}${hex(m[3] as string)}`;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
}

function resolveBackground(cs: CSSStyleDeclaration): string {
  const c = cs.backgroundColor;
  const isTransparent =
    !c || c === 'transparent' || /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(c);
  if (isTransparent) {
    return cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : '';
  }
  const hex = rgbToHex(c);
  if (hex === undefined) {
    return cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : '';
  }
  return hex || '';
}

function normalizeBox(top: string, right: string, bottom: string, left: string): string {
  const t = parseFloat(top) || 0;
  const r = parseFloat(right) || 0;
  const b = parseFloat(bottom) || 0;
  const l = parseFloat(left) || 0;
  if (t === b && r === l) return t === r ? `${t}` : `${t} ${r}`;
  return `${t} ${r} ${b} ${l}`;
}

function mapLayout(display: string, flexDirection: string): CapturedSourceStyle['layout'] {
  if (display === 'flex' || display === 'inline-flex') {
    return flexDirection === 'column' || flexDirection === 'column-reverse' ? 'flex-col' : 'flex-row';
  }
  if (display === 'grid' || display === 'inline-grid') return 'grid';
  if (display === 'block' || display === 'inline-block') return 'stack';
  return 'none';
}

function mapAxisAlign(value: string): string | undefined {
  const map: Record<string, string> = {
    'flex-start': 'start',
    'flex-end': 'end',
    'center': 'center',
    'space-between': 'space-between',
    'space-around': 'space-around',
    'space-evenly': 'space-evenly',
  };
  return map[value] || undefined;
}

function mapCrossAlign(value: string): string | undefined {
  const map: Record<string, string> = {
    'flex-start': 'start',
    'flex-end': 'end',
    'center': 'center',
    'stretch': 'stretch',
    'baseline': 'baseline',
  };
  return map[value] || undefined;
}

function isVisible(style: CSSStyleDeclaration): boolean {
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (parseFloat(style.opacity) === 0) return false;
  // Note: zero-bbox check intentionally omitted — jsdom never lays out
  // elements, so width/height are always 0 in tests.
  return true;
}

function hashId(domPath: string, x: number, y: number, w: number, h: number): string {
  let hash = 0x811c9dc5;
  const input = `${domPath}|${x}|${y}|${w}|${h}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `n_${hash.toString(16).padStart(8, '0')}`;
}

function getDomPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === 1 && node.tagName !== 'HTML') {
    let segment = node.tagName.toLowerCase();
    if (node.parentElement) {
      const sameTag = Array.from(node.parentElement.children).filter((c) => c.tagName === node!.tagName);
      if (sameTag.length > 1) {
        segment += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
    }
    parts.unshift(segment);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

function findHeadingContext(el: Element): string | undefined {
  let node: Element | null = el;
  while (node && node !== node.ownerDocument.documentElement) {
    const prev = node.previousElementSibling;
    if (prev) {
      if (HEADING_TAGS.has(prev.tagName)) {
        const t = prev.textContent ? prev.textContent.trim() : '';
        if (t) return t.slice(0, 200);
      }
      const inner = prev.querySelector && prev.querySelector('h1, h2, h3, h4, h5, h6');
      if (inner && inner.textContent) {
        const t = inner.textContent.trim();
        if (t) return t.slice(0, 200);
      }
    }
    node = node.parentElement;
  }
  return undefined;
}

function getRole(el: Element): string | undefined {
  const aria = el.getAttribute('role');
  if (aria) return aria;
  return ROLE_TAG_MAP[el.tagName];
}

function getKind(el: Element): string {
  return KIND_TAG_MAP[el.tagName] || 'container';
}

function getLabel(el: Element): string {
  if (HEADING_TAGS.has(el.tagName) && el.textContent) {
    return el.textContent.trim().slice(0, 200);
  }
  const aria = el.getAttribute('aria-label');
  if (aria) return aria.trim().slice(0, 200);
  if (el.tagName === 'IMG') return el.getAttribute('alt') || el.tagName.toLowerCase();
  if (el.textContent && el.children.length === 0) {
    return el.textContent.trim().slice(0, 200);
  }
  return el.tagName.toLowerCase();
}

function buildStyle(el: Element, view: Window): CapturedSourceStyle {
  const cs = view.getComputedStyle(el);
  return {
    layout: mapLayout(cs.display, cs.flexDirection),
    main_axis_align: mapAxisAlign(cs.justifyContent),
    cross_axis_align: mapCrossAlign(cs.alignItems),
    gap: cs.gap && cs.gap !== 'normal' ? cs.gap : undefined,
    padding: normalizeBox(cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft),
    margin: normalizeBox(cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft),
    border:
      cs.borderWidth && parseFloat(cs.borderWidth) > 0
        ? `${cs.borderWidth} ${cs.borderStyle} ${rgbToHex(cs.borderColor) || cs.borderColor}`
        : undefined,
    border_radius: cs.borderRadius && cs.borderRadius !== '0px' ? cs.borderRadius : undefined,
    background: resolveBackground(cs),
    foreground: rgbToHex(cs.color),
    font_family: cs.fontFamily,
    font_size: cs.fontSize,
    font_weight: cs.fontWeight,
    line_height: cs.lineHeight && cs.lineHeight !== 'normal' ? cs.lineHeight : undefined,
    letter_spacing: cs.letterSpacing && cs.letterSpacing !== 'normal' ? cs.letterSpacing : undefined,
    text_transform: cs.textTransform && cs.textTransform !== 'none' ? cs.textTransform : undefined,
  };
}

export function walkDocument(doc: Document, options: WalkDocumentOptions = {}): CapturedSource {
  const view = (doc.defaultView ?? globalThis) as unknown as Window;
  const nodes: PropertyNode[] = [];

  function visit(el: Element, parentId: string | null): PropertyNode | null {
    const cs = view.getComputedStyle(el);
    if (!isVisible(cs)) return null;
    const rect = el.getBoundingClientRect();
    const domPath = getDomPath(el);
    const id = hashId(domPath, rect.x, rect.y, rect.width, rect.height);

    const node: PropertyNode = {
      id,
      ...(parentId ? { parent_id: parentId } : {}),
      child_ids: [],
      label: getLabel(el),
      kind: getKind(el),
      role: getRole(el),
      heading_context: findHeadingContext(el),
      bbox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      text:
        el.children.length === 0 && el.textContent ? el.textContent.trim().slice(0, 200) || undefined : undefined,
      href: el.getAttribute('href') || undefined,
      src: el.getAttribute('src') || undefined,
      alt: el.getAttribute('alt') || undefined,
      style: buildStyle(el, view),
      source: { locator: domPath, raw: undefined },
    };

    nodes.push(node);
    for (const child of Array.from(el.children)) {
      const childNode = visit(child, id);
      if (childNode) node.child_ids.push(childNode.id);
    }
    return node;
  }

  visit(doc.body, null);

  return {
    source_kind: 'url-dom',
    source_ref: options.sourceRef || '',
    captured_at: new Date().toISOString(),
    viewport: options.viewport,
    adapter_version: ADAPTER_VERSION,
    nodes,
  };
}

// Self-contained source string for in-page evaluation. walkDocument.toString()
// alone strips module-scoped helpers; re-assemble all dependencies in order so
// a single eval() in the browser context makes walkDocument callable.
export const PAGE_SCRIPT = [
  `const ADAPTER_VERSION = ${JSON.stringify(ADAPTER_VERSION)};`,
  `const ROLE_TAG_MAP = ${JSON.stringify(ROLE_TAG_MAP)};`,
  `const KIND_TAG_MAP = ${JSON.stringify(KIND_TAG_MAP)};`,
  `const HEADING_TAGS = new Set(${JSON.stringify([...HEADING_TAGS])});`,
  rgbToHex.toString(),
  resolveBackground.toString(),
  normalizeBox.toString(),
  mapLayout.toString(),
  mapAxisAlign.toString(),
  mapCrossAlign.toString(),
  isVisible.toString(),
  hashId.toString(),
  getDomPath.toString(),
  findHeadingContext.toString(),
  getRole.toString(),
  getKind.toString(),
  getLabel.toString(),
  buildStyle.toString(),
  walkDocument.toString(),
].join('\n\n');
```

- [ ] **Step 2: Typecheck the new file**

Run: `cd packages/storybook-addon-designbook && pnpm typecheck`
Expected: PASS (no errors in `src/inspect/element-walker.ts`).

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/inspect/element-walker.ts
git commit -m "refactor(addon): move element-walker into src/inspect as typed .ts"
```

---

## Task 2: Move the walker unit test into `src/inspect/__tests__/`

**Files:**
- Create: `packages/storybook-addon-designbook/src/inspect/__tests__/element-walker.test.ts`
- Delete: `packages/storybook-addon-designbook/src/__tests__/element-walker.test.ts`

- [ ] **Step 1: Create the moved test**

Identical to the current `src/__tests__/element-walker.test.ts`, except the two import/path lines change for the new depth (one directory deeper):

```ts
import { walkDocument, PAGE_SCRIPT } from '../element-walker.js';
```
and the fixture path gains one `../`:
```ts
const html = readFileSync(
  resolve(__dirname, '../../../../../tests/fixtures/element-walker/basic-page.html'),
  'utf8',
);
```
Copy the entire body of the existing test file verbatim; only those two lines differ.

- [ ] **Step 2: Delete the old test**

```bash
git rm packages/storybook-addon-designbook/src/__tests__/element-walker.test.ts
```

- [ ] **Step 3: Run the moved test**

Run: `cd packages/storybook-addon-designbook && pnpm vitest run src/inspect/__tests__/element-walker.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 4: Commit**

```bash
git add packages/storybook-addon-designbook/src/inspect/__tests__/element-walker.test.ts
git commit -m "refactor(addon): relocate element-walker test, import from src/inspect"
```

---

## Task 3: Create `src/inspect/region.ts` (pure region matching)

Move `locateRegion`, `descendantsOf`, `promoteToContainer`, `pickRegionLabel`, `ROLE_HINTS`, and `getNested` out of `region-properties.ts`. Define `RegionProperties` here. No node:* imports — pure.

**Files:**
- Create: `packages/storybook-addon-designbook/src/inspect/region.ts`

- [ ] **Step 1: Create the file**

```ts
import type { CapturedSource, PropertyNode } from './element-walker.js';

export interface RegionProperties {
  matched_via: 'role' | 'heading' | 'label' | 'bbox' | 'none';
  root_id?: string;
  nodes: PropertyNode[];
}

const ROLE_HINTS: Array<{ pattern: RegExp; role: string }> = [
  { pattern: /^(site_)?header$|^banner$/i, role: 'banner' },
  { pattern: /^(site_)?footer$|^contentinfo$/i, role: 'contentinfo' },
  { pattern: /^(main|content)$/i, role: 'main' },
  { pattern: /(nav|navigation|menu)/i, role: 'navigation' },
  { pattern: /^(form|search)/i, role: 'form' },
];

function getNested(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const seg of path) {
    if (cur && typeof cur === 'object' && seg in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function pickRegionLabel(params: Record<string, unknown>): string {
  const componentName = getNested(params, ['component', 'component']);
  if (typeof componentName === 'string' && componentName) return componentName;
  const componentId = getNested(params, ['component', 'id']);
  if (typeof componentId === 'string' && componentId) return componentId;
  const sectionId = getNested(params, ['section', 'id']);
  if (typeof sectionId === 'string' && sectionId) return sectionId;
  const scenePath = params['scene_path'];
  if (typeof scenePath === 'string' && scenePath) {
    const segments = scenePath.split('/').filter(Boolean);
    if (segments[0] === 'sections' && segments.length >= 2) {
      return segments[1] ?? '';
    }
    if (segments[0] === 'design-system') {
      return 'shell';
    }
    const basename = segments[segments.length - 1] ?? '';
    return basename.replace(/(\.[^./]+)+$/, '');
  }
  return '';
}

function descendantsOf(captured: CapturedSource, rootId: string): PropertyNode[] {
  const byParent = new Map<string, PropertyNode[]>();
  for (const node of captured.nodes) {
    const list = byParent.get(node.parent_id ?? '') ?? [];
    list.push(node);
    byParent.set(node.parent_id ?? '', list);
  }
  const root = captured.nodes.find((n) => n.id === rootId);
  if (!root) return [];
  const visited = new Set<string>([rootId]);
  const out: PropertyNode[] = [root];
  const stack: string[] = [rootId];
  while (stack.length) {
    const parent = stack.pop()!;
    const children = byParent.get(parent) ?? [];
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      out.push(child);
      stack.push(child.id);
    }
  }
  return out;
}

/**
 * When a heading element (<h1>-<h6>) wins the match, return its enclosing
 * region instead — otherwise the subtree contains only the heading line and
 * loses the section content. Walks up via parent_id until a section, a
 * role-bearing container, or main landmark is reached.
 */
function promoteToContainer(captured: CapturedSource, hit: PropertyNode): PropertyNode {
  const byId = new Map(captured.nodes.map((n) => [n.id, n]));
  let cur: PropertyNode = hit;
  for (let depth = 0; depth < 8 && cur.parent_id; depth++) {
    const parent = byId.get(cur.parent_id);
    if (!parent) break;
    if (parent.kind === 'section' || parent.kind === 'container' || parent.role) {
      return parent;
    }
    cur = parent;
  }
  return hit;
}

function byLargestArea(a: PropertyNode, b: PropertyNode): number {
  const areaA = a.bbox.width * a.bbox.height;
  const areaB = b.bbox.width * b.bbox.height;
  if (areaA !== areaB) return areaB - areaA;
  return a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x;
}

export function locateRegion(captured: CapturedSource, label: string): RegionProperties {
  const normalized = label.toLowerCase().replace(/[-_]/g, ' ').trim();

  // 1. Role match
  for (const hint of ROLE_HINTS) {
    if (hint.pattern.test(label)) {
      const candidates = captured.nodes.filter((n) => n.role === hint.role).sort(byLargestArea);
      if (candidates[0]) {
        return {
          matched_via: 'role',
          root_id: candidates[0].id,
          nodes: descendantsOf(captured, candidates[0].id),
        };
      }
    }
  }

  // 2. Heading match
  const headingHit = captured.nodes
    .filter((n) => {
      const ctx = (n.heading_context ?? '').toLowerCase();
      const lbl = n.label.toLowerCase();
      return (normalized.length > 0 && ctx.includes(normalized)) || (normalized.length > 0 && lbl.includes(normalized));
    })
    .sort(byLargestArea)[0];
  if (headingHit) {
    const root = headingHit.kind === 'heading' ? promoteToContainer(captured, headingHit) : headingHit;
    return { matched_via: 'heading', root_id: root.id, nodes: descendantsOf(captured, root.id) };
  }

  // 3. Label match
  const labelHit = captured.nodes
    .filter((n) => n.label.toLowerCase().replace(/[-_]/g, ' ') === normalized)
    .sort(byLargestArea)[0];
  if (labelHit) {
    return { matched_via: 'label', root_id: labelHit.id, nodes: descendantsOf(captured, labelHit.id) };
  }

  // 4. Bbox / reading-order fallback intentionally not implemented in v1.
  return { matched_via: 'none', nodes: [] };
}
```

> Note: the three inlined area-sort comparators in the current resolver are deduplicated into one `byLargestArea` helper. Behavior is identical (largest visual area, then reading order).

- [ ] **Step 2: Typecheck**

Run: `cd packages/storybook-addon-designbook && pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/inspect/region.ts
git commit -m "refactor(addon): extract pure region matching into src/inspect/region.ts"
```

---

## Task 4: Create `src/inspect/__tests__/region.test.ts`

Move every matching assertion (role/heading/label/none/promote/largest/scene_path/cycle-safe) out of the resolver test. These now call `locateRegion`/`pickRegionLabel` directly — no fs mock, no resolver.

**Files:**
- Create: `packages/storybook-addon-designbook/src/inspect/__tests__/region.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from 'vitest';
import { locateRegion, pickRegionLabel } from '../region.js';
import type { CapturedSource } from '../element-walker.js';

const BASE: CapturedSource = {
  source_kind: 'url-dom',
  source_ref: 'https://example.com',
  captured_at: '2026-05-09T08:00:00Z',
  adapter_version: 'url-playwright/0.1.0',
  nodes: [
    { id: 'n_root', child_ids: ['n_header', 'n_main'], label: 'Page', kind: 'container',
      bbox: { x: 0, y: 0, width: 1440, height: 2400 },
      style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
      source: { locator: 'body' } },
    { id: 'n_header', parent_id: 'n_root', child_ids: ['n_logo'], label: 'Site Header', kind: 'container',
      role: 'banner', bbox: { x: 0, y: 0, width: 1440, height: 72 },
      style: { padding: '0 32 0 32', margin: '0', background: '#ffffff', foreground: '#111111',
        layout: 'flex-row', main_axis_align: 'space-between' },
      source: { locator: 'body > header' } },
    { id: 'n_logo', parent_id: 'n_header', child_ids: [], label: 'Brand', kind: 'link',
      bbox: { x: 32, y: 20, width: 80, height: 32 },
      style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
      source: { locator: 'body > header > a' }, href: '/' },
    { id: 'n_main', parent_id: 'n_root', child_ids: [], label: 'main', kind: 'container',
      role: 'main', bbox: { x: 0, y: 72, width: 1440, height: 1800 },
      style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
      source: { locator: 'body > main' } },
  ],
};

function withNodes(extra: CapturedSource['nodes']): CapturedSource {
  return { ...BASE, nodes: [...BASE.nodes, ...extra] };
}

describe('locateRegion', () => {
  it('matches header via role (label "header")', () => {
    const r = locateRegion(BASE, 'header');
    expect(r.matched_via).toBe('role');
    expect(r.root_id).toBe('n_header');
    expect(r.nodes.map((n) => n.id)).toEqual(['n_header', 'n_logo']);
  });

  it('matches header via role for label "site_header"', () => {
    const r = locateRegion(BASE, 'site_header');
    expect(r.matched_via).toBe('role');
    expect(r.root_id).toBe('n_header');
  });

  it('matches main via role for label "main"', () => {
    const r = locateRegion(BASE, 'main');
    expect(r.matched_via).toBe('role');
    expect(r.root_id).toBe('n_main');
  });

  it('matches a section via heading_context', () => {
    const captured = withNodes([
      { id: 'n_pricing', parent_id: 'n_main', child_ids: [], label: 'pricing-section', kind: 'section',
        heading_context: 'Pricing', bbox: { x: 0, y: 800, width: 1440, height: 600 },
        style: { padding: '64', margin: '0', background: '#fafafa', foreground: '#111111' },
        source: { locator: 'body > main > section:nth-of-type(2)' } },
    ]);
    const r = locateRegion(captured, 'pricing');
    expect(r.matched_via).toBe('heading');
    expect(r.root_id).toBe('n_pricing');
  });

  it('promotes a matched heading element to its enclosing container', () => {
    const captured: CapturedSource = {
      ...BASE,
      nodes: [
        BASE.nodes[0]!,
        { id: 'n_section', parent_id: 'n_root', child_ids: ['n_h2', 'n_para'], label: 'section', kind: 'section',
          bbox: { x: 0, y: 800, width: 1440, height: 600 },
          style: { padding: '64', margin: '0', background: '#fafafa', foreground: '#111111' },
          source: { locator: 'body > section' } },
        { id: 'n_h2', parent_id: 'n_section', child_ids: [], label: 'Pricing', kind: 'heading',
          bbox: { x: 64, y: 824, width: 200, height: 32 },
          style: { padding: '0', margin: '0', background: '', foreground: '#111111' },
          source: { locator: 'body > section > h2' } },
        { id: 'n_para', parent_id: 'n_section', child_ids: [], label: 'Plans for every team size.', kind: 'text',
          bbox: { x: 64, y: 870, width: 800, height: 24 },
          style: { padding: '0', margin: '0', background: '', foreground: '#666666' },
          source: { locator: 'body > section > p' } },
      ],
    };
    const r = locateRegion(captured, 'pricing');
    expect(r.matched_via).toBe('heading');
    expect(r.root_id).toBe('n_section');
    expect(r.nodes.map((n) => n.id)).toEqual(['n_section', 'n_h2', 'n_para']);
  });

  it('prefers the largest candidate when multiple nodes share a role', () => {
    const captured: CapturedSource = {
      ...BASE,
      nodes: [
        BASE.nodes[0]!,
        { id: 'n_footer_tiny_a', parent_id: 'n_root', child_ids: [], label: 'footer', kind: 'container',
          role: 'contentinfo', bbox: { x: 0, y: 1850, width: 1267, height: 27 },
          style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
          source: { locator: 'body > footer:nth-of-type(1)' } },
        { id: 'n_footer_tiny_b', parent_id: 'n_root', child_ids: [], label: 'footer', kind: 'container',
          role: 'contentinfo', bbox: { x: 0, y: 3253, width: 1267, height: 27 },
          style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
          source: { locator: 'body > footer:nth-of-type(2)' } },
        { id: 'n_footer_big', parent_id: 'n_root', child_ids: [], label: 'Footernavigation', kind: 'container',
          role: 'contentinfo', bbox: { x: 0, y: 4912, width: 1440, height: 698 },
          style: { padding: '64', margin: '0', background: '#1a1a1a', foreground: '#ffffff' },
          source: { locator: 'body > footer:nth-of-type(3)' } },
      ],
    };
    const r = locateRegion(captured, 'footer');
    expect(r.matched_via).toBe('role');
    expect(r.root_id).toBe('n_footer_big');
  });

  it('returns matched_via:none with empty nodes when nothing hits', () => {
    const r = locateRegion(BASE, 'nonexistent_widget');
    expect(r.matched_via).toBe('none');
    expect(r.nodes).toEqual([]);
  });

  it('is cycle-safe in descendantsOf', () => {
    const cyclic: CapturedSource = {
      ...BASE,
      nodes: [
        { id: 'a', parent_id: 'b', child_ids: ['b'], label: 'A', kind: 'container',
          role: 'main', bbox: { x: 0, y: 0, width: 10, height: 10 },
          style: { padding: '0', margin: '0', background: '', foreground: '' }, source: { locator: 'a' } },
        { id: 'b', parent_id: 'a', child_ids: ['a'], label: 'B', kind: 'container',
          bbox: { x: 0, y: 0, width: 10, height: 10 },
          style: { padding: '0', margin: '0', background: '', foreground: '' }, source: { locator: 'b' } },
      ],
    };
    const r = locateRegion(cyclic, 'main');
    expect(r.nodes.length).toBeLessThanOrEqual(2);
  });
});

describe('pickRegionLabel', () => {
  it('prefers component.component', () => {
    expect(pickRegionLabel({ component: { component: 'header', id: 'x' } })).toBe('header');
  });
  it('falls back to component.id', () => {
    expect(pickRegionLabel({ component: { id: 'site_header' } })).toBe('site_header');
  });
  it('derives label from sections scene_path', () => {
    expect(pickRegionLabel({ scene_path: 'sections/main/main.section.scenes.yml' })).toBe('main');
  });
  it('maps a design-system scene_path to "shell"', () => {
    expect(pickRegionLabel({ scene_path: 'design-system/design-system.scenes.yml' })).toBe('shell');
  });
  it('returns empty string when no identity is present', () => {
    expect(pickRegionLabel({})).toBe('');
  });
});
```

- [ ] **Step 2: Run the test**

Run: `cd packages/storybook-addon-designbook && pnpm vitest run src/inspect/__tests__/region.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/inspect/__tests__/region.test.ts
git commit -m "test(addon): pure region-matching tests in src/inspect"
```

---

## Task 5: Create `src/inspect/capture.ts`

Move `runWalker` (renamed `capture`) + `waitForReady` + `parseTimeoutMs` out of the resolver. Import `PAGE_SCRIPT` statically from `./element-walker.js` — no more `import(file://)`, no `locateWalker`.

**Files:**
- Create: `packages/storybook-addon-designbook/src/inspect/capture.ts`

- [ ] **Step 1: Create the file**

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { PAGE_SCRIPT } from './element-walker.js';

const DEFAULT_WALKER_TIMEOUT_MS = 60_000;

function parseTimeoutMs(): number {
  const raw = process.env.DESIGNBOOK_WALKER_TOTAL_TIMEOUT_MS;
  if (!raw) return DEFAULT_WALKER_TIMEOUT_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WALKER_TIMEOUT_MS;
}

// Wait until URL is stable AND networkidle has fired — handles SPA hydration,
// HTTP redirects, JS redirects, OAuth round-trips, and SPA route guards.
async function waitForReady(page: import('playwright').Page, totalBudgetMs: number): Promise<void> {
  const deadline = Date.now() + totalBudgetMs;
  let lastUrl = '';
  let lastUrlChangeAt = Date.now();
  while (Date.now() < deadline) {
    await page.waitForLoadState('load').catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const currentUrl = page.url();
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      lastUrlChangeAt = Date.now();
      continue;
    }
    if (Date.now() - lastUrlChangeAt > 1500) {
      await page.waitForTimeout(500);
      return;
    }
    await page.waitForTimeout(300);
  }
  console.warn(`[inspect] URL never stabilized within ${totalBudgetMs}ms; walking current DOM`);
}

/**
 * Launch headless chromium, navigate to `url`, wait for the page to settle,
 * evaluate the walker in-page, and write the CapturedSource JSON to `outPath`.
 * Throws if playwright is not installed or the page is unreachable — callers
 * are expected to catch and degrade gracefully.
 */
export async function capture(url: string, outPath: string): Promise<void> {
  const totalTimeoutMs = parseTimeoutMs();
  await mkdir(dirname(outPath), { recursive: true });

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    await new Promise<void>((resolveOuter, rejectOuter) => {
      timeoutHandle = setTimeout(() => {
        rejectOuter(new Error(`capture timed out after ${totalTimeoutMs}ms`));
        browser.close().catch(() => {});
      }, totalTimeoutMs);

      (async () => {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1600 } });
        const page = await context.newPage();
        try {
          await page.goto(url);
          await waitForReady(page, totalTimeoutMs);
          const vp = page.viewportSize() ?? { width: 1440, height: 1600 };
          const result = await page.evaluate(
            ({ ref, script, viewport }: { ref: string; script: string; viewport: { width: number; height: number } }) => {
              eval(script);
              // walkDocument is now in scope from PAGE_SCRIPT.
              // @ts-expect-error — walkDocument is dynamically defined.
              return walkDocument(document, { sourceRef: ref, viewport });
            },
            { ref: url, script: PAGE_SCRIPT, viewport: vp },
          );
          await writeFile(outPath, JSON.stringify(result, null, 2));
          resolveOuter();
        } finally {
          await context.close().catch(() => {});
        }
      })().catch(rejectOuter);
    });
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    await browser.close().catch(() => {});
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd packages/storybook-addon-designbook && pnpm typecheck`
Expected: PASS. (`playwright` types resolve via the peer/dev dependency; the dynamic `import('playwright')` is already externalized in `tsup.config.ts`.)

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/inspect/capture.ts
git commit -m "refactor(addon): extract playwright capture into src/inspect/capture.ts"
```

---

## Task 6: Rewrite `region-properties.ts` as a thin orchestrator

Delete `locateWalker`, the `import(pathToFileURL(...))` walker load, `runWalker`, `waitForReady`, `locateRegion` + helpers, `ROLE_HINTS`, the local type duplicates. Keep only the cache-path helpers and the orchestration.

**Files:**
- Modify (full rewrite): `packages/storybook-addon-designbook/src/resolvers/region-properties.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import { existsSync, mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve as joinPath } from 'node:path';
import { createHash } from 'node:crypto';
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';
import type { CapturedSource } from '../inspect/element-walker.js';
import { capture } from '../inspect/capture.js';
import { locateRegion, pickRegionLabel } from '../inspect/region.js';

function hashUrl(url: string): string {
  return createHash('sha256').update(url.toLowerCase().replace(/\/+$/, '')).digest('hex').slice(0, 12);
}

function referenceFolder(url: string, dataDir: string): string {
  return joinPath(dataDir, 'references', hashUrl(url));
}

export const regionPropertiesResolver: ParamResolver = {
  name: 'region_properties',

  async resolve(input: string, _config: Record<string, unknown>, context: ResolverContext): Promise<ResolverResult> {
    const url = input && input !== '' ? input : undefined;
    if (!url || !/^https?:\/\//i.test(url)) {
      return { resolved: true, value: undefined, input: url ?? '' };
    }

    // Prefer the workflow's already-resolved reference_folder so we share the
    // cache directory with extract-reference. Computing it locally would
    // duplicate reference-folder.ts's URL normalization.
    const paramRefDir = context.params.reference_folder;
    const dataDir = (context.config as { data: string }).data;
    const refDir = typeof paramRefDir === 'string' && paramRefDir ? paramRefDir : referenceFolder(url, dataDir);
    const elementTreeDir = joinPath(refDir, '.element-tree');
    const sourcePath = joinPath(elementTreeDir, 'source.json');

    if (!existsSync(sourcePath)) {
      try {
        mkdirSync(elementTreeDir, { recursive: true });
        await capture(url, sourcePath);
      } catch (error) {
        console.warn(`[region-properties] capture failed: ${(error as Error).message}`);
        return { resolved: true, value: undefined, input: url };
      }
    }

    let captured: CapturedSource;
    try {
      captured = JSON.parse(await readFile(sourcePath, 'utf8')) as CapturedSource;
      if (!captured || !Array.isArray(captured.nodes)) {
        throw new Error('CapturedSource is missing nodes[]');
      }
    } catch (error) {
      console.warn(`[region-properties] failed to read ${sourcePath}: ${(error as Error).message}`);
      return { resolved: true, value: undefined, input: url };
    }

    const label = pickRegionLabel(context.params);
    const region = locateRegion(captured, label);
    return { resolved: true, value: region as unknown as Record<string, unknown>, input: url };
  },
};
```

- [ ] **Step 2: Typecheck**

Run: `cd packages/storybook-addon-designbook && pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/region-properties.ts
git commit -m "refactor(addon): thin region_properties resolver, drop file:// walker load"
```

---

## Task 7: Slim the resolver test to orchestration only

The matching assertions moved to `region.test.ts` (Task 4). The resolver test now mocks `capture` and `fs`, covering only: name, non-URL input, empty input, cache reuse via `reference_folder`, corrupt `source.json`, and cache-miss → `capture` invoked.

**Files:**
- Modify (full rewrite): `packages/storybook-addon-designbook/src/resolvers/__tests__/region-properties.test.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { regionPropertiesResolver } from '../region-properties.js';
import type { ResolverContext } from '../types.js';

const FIXTURE_CAPTURED = {
  source_kind: 'url-dom',
  source_ref: 'https://example.com',
  captured_at: '2026-05-09T08:00:00Z',
  adapter_version: 'url-playwright/0.1.0',
  nodes: [
    { id: 'n_root', child_ids: ['n_header'], label: 'Page', kind: 'container',
      bbox: { x: 0, y: 0, width: 1440, height: 2400 },
      style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
      source: { locator: 'body' } },
    { id: 'n_header', parent_id: 'n_root', child_ids: [], label: 'Site Header', kind: 'container',
      role: 'banner', bbox: { x: 0, y: 0, width: 1440, height: 72 },
      style: { padding: '0 32 0 32', margin: '0', background: '#ffffff', foreground: '#111111' },
      source: { locator: 'body > header' } },
  ],
};

let existsValue = true;
vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => existsValue),
  mkdirSync: vi.fn(),
}));
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async () => JSON.stringify(FIXTURE_CAPTURED)),
}));
const captureMock = vi.fn(async () => undefined);
vi.mock('../../inspect/capture.js', () => ({ capture: (...args: unknown[]) => captureMock(...args) }));

function buildContext(params: Record<string, unknown>): ResolverContext {
  return { config: { data: '/tmp/designbook-data' } as never, params };
}

beforeEach(() => {
  vi.clearAllMocks();
  existsValue = true;
});

describe('regionPropertiesResolver (orchestration)', () => {
  it('has name "region_properties"', () => {
    expect(regionPropertiesResolver.name).toBe('region_properties');
  });

  it('returns value: undefined for a non-http(s) input', async () => {
    const r = await regionPropertiesResolver.resolve('figma://xyz', {}, buildContext({}));
    expect(r.resolved).toBe(true);
    expect(r.value).toBeUndefined();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('returns value: undefined for an empty input', async () => {
    const r = await regionPropertiesResolver.resolve('', {}, buildContext({}));
    expect(r.value).toBeUndefined();
  });

  it('reads cached source.json without capturing when it exists', async () => {
    existsValue = true;
    const r = await regionPropertiesResolver.resolve(
      'https://example.com',
      {},
      buildContext({ component: { component: 'header' } }),
    );
    expect(captureMock).not.toHaveBeenCalled();
    const region = r.value as { matched_via: string; root_id?: string };
    expect(region.matched_via).toBe('role');
    expect(region.root_id).toBe('n_header');
  });

  it('invokes capture on cache miss', async () => {
    existsValue = false;
    await regionPropertiesResolver.resolve(
      'https://example.com',
      {},
      buildContext({ component: { component: 'header' } }),
    );
    expect(captureMock).toHaveBeenCalledTimes(1);
  });

  it('reuses workflow-resolved reference_folder for the cache path', async () => {
    const r = await regionPropertiesResolver.resolve(
      'https://Example.com/Pricing',
      {},
      buildContext({ reference_folder: '/tmp/designbook-data/references/abc123', component: { component: 'header' } }),
    );
    expect(r.value).toBeDefined();
  });

  it('returns value: undefined when captured nodes[] is missing', async () => {
    const fs = await import('node:fs/promises');
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify({ source_kind: 'url-dom' }));
    const r = await regionPropertiesResolver.resolve(
      'https://example.com',
      {},
      buildContext({ component: { component: 'header' } }),
    );
    expect(r.value).toBeUndefined();
  });

  it('returns value: undefined when capture throws on cache miss', async () => {
    existsValue = false;
    captureMock.mockRejectedValueOnce(new Error('playwright not installed'));
    const r = await regionPropertiesResolver.resolve(
      'https://example.com',
      {},
      buildContext({ component: { component: 'header' } }),
    );
    expect(r.value).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `cd packages/storybook-addon-designbook && pnpm vitest run src/resolvers/__tests__/region-properties.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/__tests__/region-properties.test.ts
git commit -m "test(addon): slim region_properties resolver test to orchestration"
```

---

## Task 8: Delete the skill-side walker artifacts

The walker now lives in the package. Nothing references the skill `.js`/`.d.ts` anymore (verified below).

**Files:**
- Delete: `.agents/skills/designbook/design/resources/element-walker.js`
- Delete: `.agents/skills/designbook/design/resources/element-walker.d.ts`

- [ ] **Step 1: Verify no remaining references**

Run:
```bash
grep -rIn "design/resources/element-walker\|locateWalker\|pathToFileURL" packages/storybook-addon-designbook/src/ .agents/ | grep -v node_modules
```
Expected: no matches (empty output).

- [ ] **Step 2: Delete the files**

```bash
git rm .agents/skills/designbook/design/resources/element-walker.js \
       .agents/skills/designbook/design/resources/element-walker.d.ts
```

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(designbook): remove skill-side element-walker, now in addon"
```

---

## Task 9: Dependency hygiene — playwright + playwright-cli

`playwright` becomes a hard devDependency (so `capture.test.ts` runs in CI); the optional peer entry stays for addon consumers. `playwright-cli` is pinned in the workspace template (its real execution context), not the addon. The skill doc pins the npx invocation.

**Files:**
- Modify: `packages/storybook-addon-designbook/package.json`
- Modify: `packages/integrations/test-integration-drupal/package.json`
- Modify: `.agents/skills/designbook/resources/cli-playwright.md`

- [ ] **Step 1: Add `playwright` to addon devDependencies**

In `packages/storybook-addon-designbook/package.json`, add to the `devDependencies` block (keep alphabetical placement near other `p*` entries):
```json
    "playwright": "^1.58.2",
```
Leave the existing `peerDependencies.playwright` + `peerDependenciesMeta.playwright.optional` untouched.

- [ ] **Step 2: Determine the playwright-cli version to pin**

Run: `npm view playwright-cli version`
Record the printed version (call it `<PWCLI_VER>`). If the command fails (offline), use the version already cached under the repo's pnpm store: `grep -A1 "playwright-cli@" pnpm-lock.yaml | head` — otherwise pin to the latest known, `^1.0.0`, and note it in the commit message for follow-up.

- [ ] **Step 3: Add `playwright-cli` to the workspace template**

In `packages/integrations/test-integration-drupal/package.json`, add to `devDependencies`:
```json
    "playwright-cli": "<PWCLI_VER>",
```
(Use the exact version from Step 2.)

- [ ] **Step 4: Pin the npx invocation in the skill doc**

In `.agents/skills/designbook/resources/cli-playwright.md`, replace every occurrence of `npx playwright-cli` with `npx playwright-cli@<PWCLI_VER>`.

Run: `cd <repo-root> && sed -i 's/npx playwright-cli/npx playwright-cli@<PWCLI_VER>/g' .agents/skills/designbook/resources/cli-playwright.md`
(Substitute the real version.)

- [ ] **Step 5: Install + verify lockfile updates**

Run: `pnpm install`
Expected: lockfile updates with `playwright` (addon dev) and `playwright-cli` (template).

- [ ] **Step 6: Commit**

```bash
git add packages/storybook-addon-designbook/package.json \
        packages/integrations/test-integration-drupal/package.json \
        .agents/skills/designbook/resources/cli-playwright.md \
        pnpm-lock.yaml
git commit -m "build: playwright hard devDep, pin playwright-cli in workspace template"
```

---

## Task 10: Enriched fixture + real-chromium capture test

Adds the offline integration test of the full path. The fixture exercises the area tie-break (multiple banner/contentinfo candidates of different sizes), the visibility filter (hidden + opacity:0), and all three landmark roles.

**Files:**
- Create: `tests/fixtures/element-walker/regions-page.html`
- Create: `packages/storybook-addon-designbook/src/inspect/__tests__/capture.test.ts`

- [ ] **Step 1: Create the fixture**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Regions Fixture</title>
  <style>
    body { margin: 0; font-family: Inter, sans-serif; color: #111; background: #fff; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 0 32px; height: 80px; background: #ffffff; }
    nav { display: flex; gap: 24px; }
    main { padding: 48px 32px; min-height: 1200px; }
    main h2 { font-size: 28px; font-weight: 700; }
    .cta { background: #007acc; color: #fff; padding: 8px 16px; border-radius: 4px; }
    /* two tiny contentinfo sentinels + one large footer — exercises area tie-break */
    footer.sentinel { height: 24px; background: #ffffff; }
    footer.main-footer { min-height: 320px; background: #1a1a1a; color: #fff; padding: 64px 32px; }
    .hidden-display { display: none; }
    .hidden-opacity { opacity: 0; }
  </style>
</head>
<body>
  <header role="banner">
    <a href="/" class="logo">Brand</a>
    <nav role="navigation">
      <a href="/products">Products</a>
      <a href="/pricing">Pricing</a>
    </nav>
    <a href="/signup" class="cta">Sign up</a>
  </header>

  <main role="main">
    <section>
      <h2>Pricing</h2>
      <p>Plans for every team size.</p>
    </section>
    <div class="hidden-display">HIDDEN_SENTINEL</div>
    <div class="hidden-opacity">INVISIBLE_SENTINEL</div>
  </main>

  <footer class="sentinel" role="contentinfo"><span>top sentinel</span></footer>
  <footer class="sentinel" role="contentinfo"><span>mid sentinel</span></footer>
  <footer class="main-footer" role="contentinfo">
    <p>Footernavigation — © 2026 Example</p>
  </footer>
</body>
</html>
```

- [ ] **Step 2: Write the capture test**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { capture } from '../capture.js';
import { locateRegion } from '../region.js';
import type { CapturedSource } from '../element-walker.js';

const FIXTURE_URL = pathToFileURL(
  join(__dirname, '../../../../../tests/fixtures/element-walker/regions-page.html'),
).href;

describe('capture (real chromium)', () => {
  let dir: string;
  let captured: CapturedSource;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'designbook-capture-'));
    const out = join(dir, 'source.json');
    await capture(FIXTURE_URL, out);
    captured = JSON.parse(await readFile(out, 'utf8')) as CapturedSource;
  }, 60_000);

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('produces nodes with real (non-zero) layout bbox', () => {
    expect(captured.nodes.length).toBeGreaterThan(5);
    const header = captured.nodes.find((n) => n.role === 'banner');
    expect(header).toBeDefined();
    expect(header!.bbox.width).toBeGreaterThan(0);
    expect(header!.bbox.height).toBeGreaterThan(0);
  });

  it('normalizes computed colors to hex, never rgb()', () => {
    const footer = captured.nodes.find((n) => n.label.includes('Footernavigation') || n.style.background === '#1a1a1a');
    for (const node of captured.nodes) {
      expect(node.style.background).not.toMatch(/rgb/i);
    }
    expect(footer).toBeDefined();
  });

  it('filters elements hidden via display:none and opacity:0', () => {
    const labels = captured.nodes.map((n) => n.label).join(' ');
    expect(labels).not.toContain('HIDDEN_SENTINEL');
    expect(labels).not.toContain('INVISIBLE_SENTINEL');
  });

  it('locateRegion picks the largest contentinfo candidate end-to-end', () => {
    const region = locateRegion(captured, 'footer');
    expect(region.matched_via).toBe('role');
    const root = captured.nodes.find((n) => n.id === region.root_id);
    expect(root).toBeDefined();
    // The big main-footer (min-height 320px), not a 24px sentinel.
    expect(root!.bbox.height).toBeGreaterThan(100);
  });

  it('locateRegion matches banner and main via role end-to-end', () => {
    expect(locateRegion(captured, 'header').matched_via).toBe('role');
    expect(locateRegion(captured, 'main').matched_via).toBe('role');
  });
});
```

- [ ] **Step 3: Ensure chromium is installed, then run the test**

Run: `cd packages/storybook-addon-designbook && npx playwright install chromium && pnpm vitest run src/inspect/__tests__/capture.test.ts`
Expected: PASS (5 tests). First run downloads chromium.

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/element-walker/regions-page.html \
        packages/storybook-addon-designbook/src/inspect/__tests__/capture.test.ts
git commit -m "test(addon): real-chromium capture integration test + enriched fixture"
```

---

## Task 11: Prune the skill integration to `create-component`

**REQUIRED FIRST:** Invoke the `designbook-skill-creator` skill before editing any task/rule file (CLAUDE.md mandates this — load `rules/task-files.md`, `rules/rule-files.md`, and `rules/common-rules.md`). Editing without it regularly produces invalid output.

**Files:**
- Modify: `.agents/skills/designbook/scenes/tasks/create-scene.md`
- Modify: `.agents/skills/designbook/design/rules/region-properties.md`
- Modify: `.agents/skills/designbook-css-tailwind/rules/region-properties.md`
- Modify: `.agents/skills/designbook-drupal/components/rules/region-properties.md`

- [ ] **Step 1: Load the skill-creator skill**

Invoke `designbook-skill-creator`. Confirm `rules/task-files.md` + `rules/rule-files.md` + `rules/common-rules.md` are loaded.

- [ ] **Step 2: Remove the `region_properties` param from `create-scene.md`**

Delete these four lines from the `params:` block (the `region_properties` entry added by the original PR):
```yaml
    region_properties:
      $ref: ../../design/schemas.yml#/RegionProperties
      resolve: region_properties
      from: reference_url
```

- [ ] **Step 3: Narrow all three rule triggers to `[create-component]`**

In each of the three rule files, change the frontmatter trigger:
```yaml
trigger:
  steps: [create-component, create-scene]
```
to:
```yaml
trigger:
  steps: [create-component]
```
Files: `designbook/design/rules/region-properties.md`, `designbook-css-tailwind/rules/region-properties.md`, `designbook-drupal/components/rules/region-properties.md`.

- [ ] **Step 4: Verify no rule/task still ties region_properties to create-scene**

Run:
```bash
grep -rIn "region_properties\|region-properties" .agents/skills/ | grep -i "create-scene"
```
Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/scenes/tasks/create-scene.md \
        .agents/skills/designbook/design/rules/region-properties.md \
        .agents/skills/designbook-css-tailwind/rules/region-properties.md \
        .agents/skills/designbook-drupal/components/rules/region-properties.md
git commit -m "refactor(designbook): region_properties only on create-component"
```

---

## Task 12: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full check**

Run: `cd packages/storybook-addon-designbook && pnpm check`
Expected: typecheck PASS → lint PASS → test PASS. If lint flags formatting, run `pnpm --filter storybook-addon-designbook lint:fix` and re-run.

- [ ] **Step 2: Confirm the inspect module is self-contained**

Run:
```bash
grep -rIn "\.agents/skills" packages/storybook-addon-designbook/src/ | grep -v __tests__
```
Expected: no matches (no source file reaches into the skill tree; only tests read fixtures).

- [ ] **Step 3: Final commit if lint:fix changed anything**

```bash
git add -A && git commit -m "chore: lint:fix after region-properties refactor" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- Change 1 (walker → CLI): Tasks 1, 3, 5, 6, 8 ✓
- Change 2 (prune integration): Task 11 ✓ (capture-not-hoisted is a non-goal, no task needed)
- Change 3 (testability): Tasks 2, 4, 7, 10 ✓
- Change 4 (playwright-cli hygiene): Task 9 ✓

**Type consistency:** `CapturedSource`/`PropertyNode` defined in `element-walker.ts`, imported by `region.ts`, `capture.ts`, and the resolver. `RegionProperties` defined in `region.ts`. `capture(url, outPath)` signature matches its call in the resolver and `capture.test.ts`. `locateRegion(captured, label)` and `pickRegionLabel(params)` signatures match across `region.ts`, `region.test.ts`, `capture.test.ts`, and the resolver.

**Placeholder scan:** `<PWCLI_VER>` in Task 9 is a value the engineer resolves in Step 2 (a command with a recorded result), not a code placeholder. All code steps contain complete code.

**Fixture-path depth:** moved tests sit at `src/inspect/__tests__/` (one level deeper than the old `src/__tests__/`), so fixture paths use five `../` segments — applied in Tasks 2, 4 (no fixture), and 10.
